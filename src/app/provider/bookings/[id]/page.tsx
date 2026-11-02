import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateBookingStatusAction } from '@/app/actions/provider';
import { cancelBookingAction } from '@/app/actions/bookings';
import { openConversationAction } from '@/app/actions/shared';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/errors';
import { Card, Field, Flash, PageHeader, SectionTitle, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, linkClass } from '@/components/styles';
import { REQUEST_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime, formatMoney } from '@/lib/format';
import { allowedNextBookingStatuses, canCancelBooking, type BookingStatus } from '@/lib/rules';

export const metadata: Metadata = { title: 'Booking' };

const STEP_BUTTON_LABELS: Partial<Record<BookingStatus, string>> = {
  provider_on_the_way: 'I am on my way',
  work_in_progress: 'Start work',
  completed: 'Mark job completed',
};

export default async function ProviderBookingDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireRole('provider');
  const { id } = await params;
  const flash = await searchParams;
  if (!isUuid(id)) notFound();

  const [booking] = await query<{
    id: string; status: BookingStatus; provider_id: string; customer_id: string; customer_name: string;
    request_id: string; description: string; area: string; address: string; preferred_at: Date | null;
    category_name: string; total_estimate: string; labour_cost: string; material_cost: string;
    estimated_duration: string; accepted_at: Date; completed_at: Date | null; cancellation_reason: string | null;
    review_rating: number | null; review_text: string | null;
  }>(
    `SELECT b.id, b.status, b.provider_id, b.customer_id, u.name AS customer_name, b.request_id,
            r.description, r.area, r.address, r.preferred_at, c.name AS category_name,
            q.total_estimate, q.labour_cost, q.material_cost, q.estimated_duration,
            b.accepted_at, b.completed_at, b.cancellation_reason,
            rv.rating AS review_rating, rv.review_text
       FROM bookings b
       JOIN service_requests r ON r.id = b.request_id
       JOIN service_categories c ON c.id = r.category_id
       JOIN quotations q ON q.id = b.quotation_id
       JOIN users u ON u.id = b.customer_id
       LEFT JOIN reviews rv ON rv.booking_id = b.id
      WHERE b.id = $1`,
    [id],
  );
  if (!booking || booking.provider_id !== user.id) notFound();

  const nextSteps = allowedNextBookingStatuses(booking.status).filter((s) => s !== 'cancelled');
  const isOpen = booking.status !== 'completed' && booking.status !== 'cancelled';

  return (
    <>
      <PageHeader
        title={`${booking.category_name} for ${booking.customer_name}`}
        subtitle={`Accepted ${formatDateTime(booking.accepted_at)}`}
        action={
          <StatusBadge
            label={REQUEST_STATUS_LABELS[booking.status]}
            tone={booking.status === 'completed' ? 'green' : booking.status === 'cancelled' ? 'red' : 'blue'}
          />
        }
      />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle>Job</SectionTitle>
            <p className="whitespace-pre-line text-slate-700">{booking.description}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Address (shared after acceptance)</dt><dd className="font-semibold text-slate-900">{booking.address}</dd></div>
              <div><dt className="text-slate-500">Area</dt><dd className="font-medium text-slate-900">{booking.area}</dd></div>
              <div><dt className="text-slate-500">Preferred time</dt><dd className="font-medium text-slate-900">{booking.preferred_at ? formatDateTime(booking.preferred_at) : 'Flexible'}</dd></div>
              <div><dt className="text-slate-500">Estimated time</dt><dd className="font-medium text-slate-900">{booking.estimated_duration}</dd></div>
            </dl>
            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-blue-100 p-3 text-sm">
              <div><dt className="text-slate-500">Total (est.)</dt><dd className="font-bold">{formatMoney(booking.total_estimate)}</dd></div>
              <div><dt className="text-slate-500">Labour</dt><dd>{formatMoney(booking.labour_cost)}</dd></div>
              <div><dt className="text-slate-500">Materials</dt><dd>{formatMoney(booking.material_cost)}</dd></div>
            </dl>
          </Card>

          {booking.review_rating ? (
            <Card>
              <SectionTitle>Customer review</SectionTitle>
              <p className="font-semibold text-amber-600">{'★'.repeat(booking.review_rating)}<span className="text-slate-300">{'★'.repeat(5 - booking.review_rating)}</span></p>
              {booking.review_text ? <p className="mt-1 text-slate-700">{booking.review_text}</p> : null}
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Progress</SectionTitle>
            <ol className="space-y-1 text-sm text-slate-600">
              {(['quotation_accepted', 'provider_on_the_way', 'work_in_progress', 'completed'] as const).map((step) => (
                <li key={step} className={step === booking.status ? 'font-semibold text-blue-900' : ''}>
                  {step === booking.status ? '● ' : '○ '}{REQUEST_STATUS_LABELS[step]}
                </li>
              ))}
            </ol>

            {isOpen && nextSteps.length > 0 ? (
              <div className="mt-4 space-y-2">
                {nextSteps.map((step) => (
                  <form key={step} action={updateBookingStatusAction}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input type="hidden" name="status" value={step} />
                    <SubmitButton pendingLabel="Updating…" className="w-full">
                      {STEP_BUTTON_LABELS[step] ?? REQUEST_STATUS_LABELS[step]}
                    </SubmitButton>
                  </form>
                ))}
              </div>
            ) : null}

            {booking.status === 'completed' ? (
              <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Completed {booking.completed_at ? formatDateTime(booking.completed_at) : ''}. This job can now appear in your WorkProof.
                Add photos on the <Link href="/provider/work-photos" className={linkClass}>WorkProof page</Link>.
              </p>
            ) : null}
            {booking.status === 'cancelled' && booking.cancellation_reason ? (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">Cancelled: {booking.cancellation_reason}</p>
            ) : null}
          </Card>

          <Card>
            <SectionTitle>Contact and support</SectionTitle>
            <form action={openConversationAction}>
              <input type="hidden" name="request_id" value={booking.request_id} />
              <SubmitButton variant="secondary" pendingLabel="Opening…" className="w-full">Message customer</SubmitButton>
            </form>
            <Link href="/complaints" className={`${linkClass} mt-3 inline-block`}>Raise a complaint</Link>

            {canCancelBooking(booking.status) ? (
              <form action={cancelBookingAction} className="mt-4 space-y-2 border-t border-blue-100 pt-4">
                <input type="hidden" name="booking_id" value={booking.id} />
                <Field label="Reason for cancelling" htmlFor="reason">
                  <input id="reason" name="reason" type="text" required maxLength={500} className={inputClass} />
                </Field>
                <SubmitButton variant="danger" pendingLabel="Cancelling…" className="w-full">Cancel booking</SubmitButton>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
