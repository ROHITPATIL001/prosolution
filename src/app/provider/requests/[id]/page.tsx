import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { submitQuotationAction, withdrawQuotationAction } from '@/app/actions/provider';
import { openConversationAction } from '@/app/actions/shared';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/errors';
import { Card, Field, Flash, PageHeader, SectionTitle, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, linkClass } from '@/components/styles';
import { REQUEST_STATUS_LABELS, QUOTE_EXPIRY_DAYS } from '@/lib/constants';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { isQuotationExpired, type QuotationStatus, type RequestStatus } from '@/lib/rules';

export const metadata: Metadata = { title: 'Request' };

export default async function ProviderRequestDetail({
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

  const [request] = await query<{
    id: string; customer_id: string; description: string; area: string; preferred_at: Date | null;
    status: RequestStatus; created_at: Date; category_name: string; offers: boolean;
  }>(
    `SELECT r.id, r.customer_id, r.description, r.area, r.preferred_at, r.status, r.created_at, c.name AS category_name,
            EXISTS (SELECT 1 FROM provider_services s WHERE s.provider_id = $2 AND s.category_id = r.category_id AND s.is_active) AS offers
       FROM service_requests r JOIN service_categories c ON c.id = r.category_id
      WHERE r.id = $1`,
    [id, user.id],
  );
  if (!request || request.customer_id === user.id) notFound();

  const quoteRows = await query<{
    id: string; status: QuotationStatus; expires_at: Date; total_estimate: string; labour_cost: string;
    material_cost: string; estimated_duration: string; warranty_text: string | null; notes: string | null;
    conversation_id: string | null;
  }>(
    `SELECT q.id, q.status, q.expires_at, q.total_estimate, q.labour_cost, q.material_cost,
            q.estimated_duration, q.warranty_text, q.notes,
            (SELECT cv.id FROM conversations cv WHERE cv.request_id = q.request_id AND cv.provider_id = q.provider_id) AS conversation_id
       FROM quotations q WHERE q.request_id = $1 AND q.provider_id = $2`,
    [id, user.id],
  );
  const myQuote = quoteRows[0];

  const attachments = await query<{ id: string; original_name: string }>(
    `SELECT id, original_name FROM request_attachments WHERE request_id = $1 ORDER BY created_at`,
    [id],
  );

  const open = request.status === 'submitted' || request.status === 'quotations_received';
  const expired = myQuote ? isQuotationExpired({ status: myQuote.status, expiresAt: new Date(myQuote.expires_at) }) : false;
  const canQuote = open && request.offers && !myQuote;

  return (
    <>
      <PageHeader
        title={request.category_name}
        subtitle={`${request.area} · Posted ${formatDateTime(request.created_at)}`}
        action={<StatusBadge label={REQUEST_STATUS_LABELS[request.status]} />}
      />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle>Job details</SectionTitle>
          <p className="whitespace-pre-line text-slate-700">{request.description}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Preferred time</dt><dd className="font-medium text-slate-900">{request.preferred_at ? formatDateTime(request.preferred_at) : 'Flexible'}</dd></div>
            <div><dt className="text-slate-500">Street address</dt><dd className="font-medium text-slate-900">Shared after the customer accepts a quotation</dd></div>
          </dl>
          {attachments.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {attachments.map((a) => (
                <li key={a.id}>
                  <a href={`/api/files/request-attachment/${a.id}`} target="_blank" rel="noopener" className={linkClass}>
                    View photo: {a.original_name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <div className="space-y-4">
          {myQuote ? (
            <Card>
              <SectionTitle>Your quotation</SectionTitle>
              <p className="text-sm font-medium text-slate-800">
                {myQuote.status === 'active' && !expired ? 'Open' : myQuote.status === 'accepted' ? 'Accepted' : myQuote.status === 'withdrawn' ? 'Withdrawn' : myQuote.status === 'not_selected' ? 'Not selected' : 'Expired'}
              </p>
              <dl className="mt-3 divide-y divide-blue-100 rounded-xl border border-blue-100 text-sm">
                <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-slate-600">Total</dt><dd className="font-bold">{formatMoney(myQuote.total_estimate)}</dd></div>
                <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-slate-600">Labour</dt><dd>{formatMoney(myQuote.labour_cost)}</dd></div>
                <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-slate-600">Materials</dt><dd>{formatMoney(myQuote.material_cost)}</dd></div>
                <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-slate-600">Time</dt><dd>{myQuote.estimated_duration}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-slate-500">Valid until {formatDate(myQuote.expires_at)}</p>
              <div className="mt-4 flex flex-col gap-2">
                <form action={openConversationAction}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <SubmitButton variant="secondary" pendingLabel="Opening…" className="w-full">Message customer</SubmitButton>
                </form>
                {myQuote.status === 'active' && open ? (
                  <form action={withdrawQuotationAction}>
                    <input type="hidden" name="request_id" value={request.id} />
                    <input type="hidden" name="quotation_id" value={myQuote.id} />
                    <SubmitButton variant="danger" pendingLabel="Withdrawing…" className="w-full">Withdraw quotation</SubmitButton>
                  </form>
                ) : null}
              </div>
            </Card>
          ) : null}

          {!request.offers ? (
            <Card>
              <p className="text-sm text-slate-700">You do not offer this service category, so you cannot quote on it.</p>
            </Card>
          ) : null}

          {canQuote ? (
            <Card>
              <SectionTitle>Send a quotation</SectionTitle>
              <p className="mb-4 text-sm text-slate-600">
                Your quote is valid for {QUOTE_EXPIRY_DAYS} days. Amounts are estimates and must cover labour and materials.
              </p>
              <form action={submitQuotationAction} className="space-y-4">
                <input type="hidden" name="request_id" value={request.id} />
                <Field label="Estimated total" htmlFor="total_estimate">
                  <input id="total_estimate" name="total_estimate" type="number" min={0.01} step="0.01" inputMode="decimal" required className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Labour" htmlFor="labour_cost">
                    <input id="labour_cost" name="labour_cost" type="number" min={0} step="0.01" inputMode="decimal" required className={inputClass} />
                  </Field>
                  <Field label="Materials" htmlFor="material_cost">
                    <input id="material_cost" name="material_cost" type="number" min={0} step="0.01" inputMode="decimal" required className={inputClass} />
                  </Field>
                </div>
                <Field label="Estimated completion time" htmlFor="estimated_duration" hint="For example: 2 hours, or 1–2 days">
                  <input id="estimated_duration" name="estimated_duration" type="text" maxLength={80} required className={inputClass} />
                </Field>
                <Field label="Warranty or guarantee (optional)" htmlFor="warranty_text">
                  <input id="warranty_text" name="warranty_text" type="text" maxLength={300} className={inputClass} />
                </Field>
                <Field label="Notes (optional)" htmlFor="notes">
                  <textarea id="notes" name="notes" rows={3} maxLength={1000} className={inputClass} />
                </Field>
                <SubmitButton pendingLabel="Sending…" className="w-full">Send quotation</SubmitButton>
              </form>
            </Card>
          ) : null}

          {!open && !myQuote ? (
            <Card>
              <p className="text-sm text-slate-700">This request is no longer accepting quotations.</p>
              <Link href="/provider/requests" className={`${linkClass} mt-2 inline-block`}>Back to open requests</Link>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
