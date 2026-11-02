import type { Metadata } from 'next';
import { createComplaintAction } from '@/app/actions/shared';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Field, Flash, PageHeader, SectionTitle, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass } from '@/components/styles';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Complaints' };

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireUser();
  const flash = await searchParams;

  // Bookings this user can complain about (customers and providers only).
  const bookings = await query<{ id: string; label: string }>(
    `SELECT b.id, c.name || ' · ' || to_char(b.accepted_at, 'YYYY-MM-DD') || ' · ' ||
            CASE WHEN b.customer_id = $1 THEN 'provider: ' || pu.name ELSE 'customer: ' || cu.name END AS label
       FROM bookings b
       JOIN service_requests r ON r.id = b.request_id
       JOIN service_categories c ON c.id = r.category_id
       JOIN users cu ON cu.id = b.customer_id
       JOIN users pu ON pu.id = b.provider_id
      WHERE (b.customer_id = $1 OR b.provider_id = $1)
      ORDER BY b.accepted_at DESC LIMIT 50`,
    [user.id],
  );

  const complaints = await query<{
    id: string; category: string; status: string; description: string; resolution_notes: string | null; created_at: Date;
  }>(
    `SELECT id, category, status, description, resolution_notes, created_at
       FROM complaints WHERE raised_by = $1 ORDER BY created_at DESC LIMIT 50`,
    [user.id],
  );

  return (
    <>
      <PageHeader title="Complaints" subtitle="Raise a problem about a booking. An administrator reviews every complaint." />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle>Raise a complaint</SectionTitle>
          {bookings.length === 0 ? (
            <EmptyState title="No bookings yet">You can raise a complaint once a booking exists.</EmptyState>
          ) : (
            <form action={createComplaintAction} className="space-y-4">
              <Field label="Booking" htmlFor="booking_id">
                <select id="booking_id" name="booking_id" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Choose a booking</option>
                  {bookings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </Field>
              <Field label="Category" htmlFor="category">
                <select id="category" name="category" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Choose a category</option>
                  {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="What happened?" htmlFor="description" hint="10 to 2000 characters. Stick to facts and dates.">
                <textarea id="description" name="description" rows={5} required minLength={10} maxLength={2000} className={inputClass} />
              </Field>
              <SubmitButton pendingLabel="Submitting…" className="w-full">Submit complaint</SubmitButton>
            </form>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>Your complaints</SectionTitle>
          {complaints.length === 0 ? (
            <EmptyState title="No complaints filed" />
          ) : (
            <ul className="divide-y divide-blue-100">
              {complaints.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{COMPLAINT_CATEGORY_LABELS[c.category] ?? c.category}</p>
                    <StatusBadge label={COMPLAINT_STATUS_LABELS[c.status] ?? c.status} tone={c.status === 'resolved' || c.status === 'closed' ? 'green' : 'amber'} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{c.description}</p>
                  {c.resolution_notes ? <p className="mt-2 rounded-lg bg-blue-50 p-2 text-sm text-slate-800">Outcome: {c.resolution_notes}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">Filed {formatDate(c.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
