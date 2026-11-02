import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { acceptQuotationAction, cancelRequestAction, submitReviewAction } from '@/app/actions/customer';
import { cancelBookingAction } from '@/app/actions/bookings';
import { openConversationAction } from '@/app/actions/shared';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { isUuid } from '@/lib/errors';
import { Card, EmptyState, Field, Flash, PageHeader, SectionTitle, StatusBadge, Avatar, StarRating } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { buttonClass, inputClass, linkClass, secondaryButtonClass } from '@/components/styles';
import { REQUEST_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { CategoryIcon } from '@/components/category-icon';
import {
  canCancelBooking,
  canCancelRequest,
  isQuotationExpired,
  type QuotationStatus,
  type RequestStatus,
} from '@/lib/rules';
import {
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Sparkles,
  Coins,
  Star,
  Check,
  HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = { title: 'Request Details & Quotations' };

type RequestRow = {
  id: string;
  customer_id: string;
  description: string;
  area: string;
  address: string;
  preferred_at: Date | null;
  status: RequestStatus;
  cancellation_reason: string | null;
  created_at: Date;
  category_name: string;
};

type QuoteRow = {
  id: string;
  provider_id: string;
  provider_name: string;
  verification_status: string;
  total_estimate: string;
  labour_cost: string;
  material_cost: string;
  estimated_duration: string;
  warranty_text: string | null;
  notes: string | null;
  status: QuotationStatus;
  expires_at: Date;
  avg_rating: number;
  review_count: number;
  conversation_id: string | null;
};

type BookingRow = {
  id: string;
  status: RequestStatus;
  provider_id: string;
  provider_name: string;
  accepted_at: Date;
  completed_at: Date | null;
  total_estimate: string;
  review_id: string | null;
};

const BOOKING_STEPS = [
  { id: 'quotation_accepted', label: 'Quotation Accepted' },
  { id: 'provider_on_the_way', label: 'Provider on the Way' },
  { id: 'work_in_progress', label: 'Work in Progress' },
  { id: 'completed', label: 'Completed' },
] as const;

export default async function CustomerRequestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireRole('customer');
  const { id } = await params;
  const flash = await searchParams;
  if (!isUuid(id)) notFound();

  const [request] = await query<RequestRow>(
    `SELECT r.id, r.customer_id, r.description, r.area, r.address, r.preferred_at, r.status,
            r.cancellation_reason, r.created_at, c.name AS category_name
       FROM service_requests r JOIN service_categories c ON c.id = r.category_id
      WHERE r.id = $1`,
    [id],
  );
  if (!request || request.customer_id !== user.id) notFound();

  const attachments = await query<{ id: string; original_name: string }>(
    `SELECT id, original_name FROM request_attachments WHERE request_id = $1 ORDER BY created_at`,
    [id],
  );

  // FairQuote fields (Section 8): total, labour, materials, time, warranty, ratings and review count.
  const quotes = await query<QuoteRow>(
    `SELECT q.id, q.provider_id, u.name AS provider_name, p.verification_status,
            q.total_estimate, q.labour_cost, q.material_cost, q.estimated_duration, q.warranty_text, q.notes,
            q.status, q.expires_at,
            COALESCE((SELECT avg(rv.rating)::float8 FROM reviews rv WHERE rv.provider_id = q.provider_id AND rv.moderation_status = 'published'), 0) AS avg_rating,
            (SELECT count(*)::int FROM reviews rv WHERE rv.provider_id = q.provider_id AND rv.moderation_status = 'published') AS review_count,
            (SELECT cv.id FROM conversations cv WHERE cv.request_id = q.request_id AND cv.provider_id = q.provider_id AND cv.customer_id = $2) AS conversation_id
       FROM quotations q
       JOIN provider_profiles p ON p.user_id = q.provider_id
       JOIN users u ON u.id = q.provider_id
      WHERE q.request_id = $1
      ORDER BY q.created_at`,
    [id, user.id],
  );

  const [booking] = await query<BookingRow>(
    `SELECT b.id, b.status, b.provider_id, u.name AS provider_name, b.accepted_at, b.completed_at,
            q.total_estimate, rv.id AS review_id
       FROM bookings b
       JOIN users u ON u.id = b.provider_id
       JOIN quotations q ON q.id = b.quotation_id
       LEFT JOIN reviews rv ON rv.booking_id = b.id
      WHERE b.request_id = $1`,
    [id],
  );

  const acceptingOpen = request.status === 'quotations_received';
  const canCancel = canCancelRequest(request.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.category_name}
        subtitle={`Posted on ${formatDateTime(request.created_at)} · Request ID: ${request.id.slice(0, 8)}`}
        backHref="/customer/requests"
        backLabel="Back to my requests"
        action={
          <StatusBadge
            label={REQUEST_STATUS_LABELS[request.status]}
            tone={request.status === 'completed' ? 'green' : request.status === 'cancelled' ? 'red' : 'blue'}
          />
        }
      />

      <Flash ok={flash.ok} error={flash.error} />

      {/* Confirmed Booking Lifecycle Banner */}
      {booking ? (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Booking Confirmed</span>
              <h2 className="text-xl font-bold text-slate-900">Assigned Provider: {booking.provider_name}</h2>
              <p className="text-xs text-slate-600">
                Accepted estimate: <strong className="text-slate-900">{formatMoney(booking.total_estimate)}</strong> on {formatDate(booking.accepted_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={openConversationAction}>
                <input type="hidden" name="request_id" value={request.id} />
                <input type="hidden" name="counterpart_id" value={booking.provider_id} />
                <SubmitButton pendingLabel="Opening chat…" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Message provider</span>
                </SubmitButton>
              </form>
              <Link
                href="/complaints"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Support / Complaints</span>
              </Link>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="mt-6 border-t border-blue-100 pt-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BOOKING_STEPS.map((s, index) => {
                const currentIdx = BOOKING_STEPS.findIndex((x) => x.id === booking.status);
                const isPassed = currentIdx >= index;
                const isCurrent = booking.status === s.id;
                return (
                  <div key={s.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                            : isPassed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isPassed && !isCurrent ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          isPassed ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? 'text-blue-900 font-bold'
                          : isPassed
                          ? 'text-emerald-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Request Details & Cancel Form (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <SectionTitle>Job Details</SectionTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              {request.description}
            </p>

            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <dt className="text-slate-400 font-medium">Area</dt>
                  <dd className="font-bold text-slate-800">{request.area}</dd>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <dt className="text-slate-400 font-medium">Preferred timing</dt>
                  <dd className="font-semibold text-slate-800">
                    {request.preferred_at ? formatDateTime(request.preferred_at) : 'Flexible schedule'}
                  </dd>
                </div>
              </div>

              {booking ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/50 p-2.5 border border-blue-100">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-blue-700 font-bold">Address shared with provider</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{request.address}</dd>
                  </div>
                </div>
              ) : null}
            </dl>

            {/* Photos */}
            {attachments.length > 0 ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-700 mb-2">Attached job photos ({attachments.length})</p>
                <ul className="space-y-1.5">
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/api/files/request-attachment/${a.id}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate max-w-56">{a.original_name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {request.status === 'cancelled' && request.cancellation_reason ? (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-900 border border-red-200">
                <strong>Cancelled:</strong> {request.cancellation_reason}
              </div>
            ) : null}
          </Card>

          {/* Rate & Review Form if completed */}
          {booking?.status === 'completed' && !booking.review_id ? (
            <Card className="border-amber-200 bg-amber-50/40">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
                <h3 className="font-bold text-slate-900 text-sm">Rate this completed job</h3>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Your rating and review help other community members hire with confidence.
              </p>
              <form action={submitReviewAction} className="space-y-3">
                <input type="hidden" name="booking_id" value={booking.id} />
                <input type="hidden" name="request_id" value={request.id} />
                <Field label="Rating" htmlFor="rating" required>
                  <select id="rating" name="rating" required defaultValue="" className={inputClass}>
                    <option value="" disabled>Select stars</option>
                    <option value="5">★★★★★ 5 — Excellent</option>
                    <option value="4">★★★★☆ 4 — Good</option>
                    <option value="3">★★★☆☆ 3 — Average</option>
                    <option value="2">★★☆☆☆ 2 — Poor</option>
                    <option value="1">★☆☆☆☆ 1 — Very poor</option>
                  </select>
                </Field>
                <Field label="Your feedback (optional)" htmlFor="review_text">
                  <textarea
                    id="review_text"
                    name="review_text"
                    rows={3}
                    maxLength={1000}
                    placeholder="Share your experience regarding punctuality, quality, and communication..."
                    className={inputClass}
                  />
                </Field>
                <SubmitButton pendingLabel="Publishing review…" className="w-full">
                  Submit review
                </SubmitButton>
              </form>
            </Card>
          ) : null}

          {/* Cancel request or booking */}
          {canCancel ? (
            <Card className="border-slate-200">
              <SectionTitle>Cancel this request</SectionTitle>
              <p className="text-xs text-slate-500 mb-3">You can cancel as long as no quotation has been accepted.</p>
              <form action={cancelRequestAction} className="space-y-3">
                <input type="hidden" name="request_id" value={request.id} />
                <Field label="Reason (optional)" htmlFor="reason">
                  <input id="reason" name="reason" type="text" maxLength={500} placeholder="e.g. Changed plans" className={inputClass} />
                </Field>
                <SubmitButton variant="danger" pendingLabel="Cancelling…" className="w-full">
                  Cancel request
                </SubmitButton>
              </form>
            </Card>
          ) : null}

          {booking && canCancelBooking(booking.status) ? (
            <Card className="border-red-200">
              <SectionTitle>Cancel booking</SectionTitle>
              <p className="text-xs text-slate-500 mb-3">Cancellation is permitted before work starts.</p>
              <form action={cancelBookingAction} className="space-y-3">
                <input type="hidden" name="booking_id" value={booking.id} />
                <Field label="Reason for cancelling" htmlFor="booking_reason" required>
                  <input id="booking_reason" name="reason" type="text" required maxLength={500} className={inputClass} />
                </Field>
                <SubmitButton variant="danger" pendingLabel="Cancelling…" className="w-full">
                  Cancel booking
                </SubmitButton>
              </form>
            </Card>
          ) : null}
        </div>

        {/* Right Column: Compare Quotations (2 cols) */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <SectionTitle className="mb-0">
                {acceptingOpen || quotes.length > 0 ? 'Compare Quotations (FairQuote™)' : 'Quotations'}
              </SectionTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized labour & materials estimates. You compare and choose before any work begins.
              </p>
            </div>
            {quotes.length > 0 ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
              </span>
            ) : null}
          </div>

          {quotes.length === 0 ? (
            <EmptyState
              title="Waiting for quotations"
              icon={<Coins className="h-6 w-6 text-blue-600" />}
            >
              <p className="mb-2">Verified providers in this category have been notified.</p>
              <p className="text-xs text-slate-400">Quotations will arrive here shortly with detailed cost breakdowns.</p>
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {quotes.map((q) => {
                const expired = isQuotationExpired({ status: q.status, expiresAt: new Date(q.expires_at) });
                const isAccepted = q.status === 'accepted';
                const canAccept = acceptingOpen && q.status === 'active' && !expired;

                return (
                  <Card
                    key={q.id}
                    className={`flex flex-col justify-between transition-all duration-200 ${
                      isAccepted
                        ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-md bg-emerald-50/20'
                        : 'hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Provider Header */}
                      <div className="flex items-start gap-3">
                        <Avatar name={q.provider_name} size="md" verified={q.verification_status === 'approved'} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="truncate font-bold text-slate-900 text-sm">{q.provider_name}</h3>
                            {isAccepted ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                                <CheckCircle2 className="h-3 w-3" />
                                Accepted
                              </span>
                            ) : q.status === 'not_selected' ? (
                              <StatusBadge label="Not selected" tone="slate" />
                            ) : q.status === 'withdrawn' ? (
                              <StatusBadge label="Withdrawn" tone="amber" />
                            ) : expired ? (
                              <StatusBadge label="Expired" tone="red" />
                            ) : (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                                Open quote
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <StarRating rating={q.avg_rating} reviewCount={num(q.review_count)} />
                          </div>
                        </div>
                      </div>

                      {/* Prominent Price & Breakdown Box */}
                      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
                        <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-semibold text-slate-600">Total Estimate</span>
                          <span className="text-xl font-black text-blue-900 tracking-tight">
                            {formatMoney(q.total_estimate)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">Labour:</span>
                            <p className="font-bold text-slate-800">{formatMoney(q.labour_cost)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Materials:</span>
                            <p className="font-bold text-slate-800">{formatMoney(q.material_cost)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2 text-xs">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{q.estimated_duration}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{q.warranty_text ?? 'No warranty'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Provider Notes */}
                      {q.notes ? (
                        <div className="mt-3 rounded-xl bg-white p-2.5 text-xs text-slate-700 border border-slate-100">
                          <span className="font-bold text-slate-800 block mb-0.5">Note from provider:</span>
                          <p className="line-clamp-3 leading-relaxed">{q.notes}</p>
                        </div>
                      ) : null}

                      <p className="mt-2 text-[11px] text-slate-400">
                        {q.status === 'active' && !expired
                          ? `Valid until ${formatDate(q.expires_at)}`
                          : `Closed on ${formatDate(q.expires_at)}`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-3">
                      {canAccept ? (
                        <form action={acceptQuotationAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="quotation_id" value={q.id} />
                          <SubmitButton className="w-full gap-2 font-bold shadow-xs">
                            <Check className="h-4 w-4" />
                            <span>Accept this quotation</span>
                          </SubmitButton>
                        </form>
                      ) : null}

                      {q.status !== 'withdrawn' ? (
                        <form action={openConversationAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="counterpart_id" value={q.provider_id} />
                          <SubmitButton variant="secondary" pendingLabel="Opening…" className="w-full gap-2 text-xs font-semibold">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{q.conversation_id ? 'Open chat messages' : 'Ask provider a question'}</span>
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
