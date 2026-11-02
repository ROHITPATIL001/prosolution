import type { Metadata } from 'next';
import { resolveComplaintAction } from '@/app/actions/admin';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Field, Flash, PageHeader, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass } from '@/components/styles';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Complaints & disputes' };

export default async function AdminComplaintsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole('admin');
  const flash = await searchParams;

  const complaints = await query<{
    id: string; category: string; status: string; description: string; resolution_notes: string | null;
    created_at: Date; raised_by_name: string; against_name: string; booking_id: string | null;
  }>(
    `SELECT c.id, c.category, c.status, c.description, c.resolution_notes, c.created_at, c.booking_id,
            ru.name AS raised_by_name, au.name AS against_name
       FROM complaints c
       JOIN users ru ON ru.id = c.raised_by
       JOIN users au ON au.id = c.against_user_id
      ORDER BY (c.status IN ('resolved', 'closed')) ASC, c.created_at ASC
      LIMIT 100`,
  );

  return (
    <>
      <PageHeader title="Complaints & disputes" subtitle="Review each complaint, record notes and close it. The complainant is notified of changes." />
      <Flash ok={flash.ok} error={flash.error} />

      {complaints.length === 0 ? (
        <EmptyState title="No complaints filed" />
      ) : (
        <ul className="space-y-4">
          {complaints.map((c) => {
            const closed = c.status === 'resolved' || c.status === 'closed';
            return (
              <li key={c.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">
                      {COMPLAINT_CATEGORY_LABELS[c.category] ?? c.category}: {c.raised_by_name} vs {c.against_name}
                    </h2>
                    <StatusBadge label={COMPLAINT_STATUS_LABELS[c.status] ?? c.status} tone={closed ? 'green' : 'amber'} />
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{c.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Filed {formatDate(c.created_at)}{c.booking_id ? ' · linked to a booking' : ' · not linked to a booking'}
                  </p>
                  {c.resolution_notes ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-slate-800">Notes: {c.resolution_notes}</p> : null}

                  {!closed ? (
                    <form action={resolveComplaintAction} className="mt-4 grid gap-3 border-t border-blue-100 pt-4 sm:grid-cols-[12rem_1fr]">
                      <input type="hidden" name="complaint_id" value={c.id} />
                      <Field label="Update status" htmlFor={`status-${c.id}`}>
                        <select id={`status-${c.id}`} name="status" required defaultValue="under_review" className={inputClass}>
                          <option value="under_review">Under review</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </Field>
                      <Field label="Resolution notes" htmlFor={`notes-${c.id}`} hint="Required to resolve or close.">
                        <textarea id={`notes-${c.id}`} name="resolution_notes" rows={2} maxLength={2000} className={inputClass} />
                      </Field>
                      <div className="sm:col-span-2">
                        <SubmitButton pendingLabel="Saving…">Save update</SubmitButton>
                      </div>
                    </form>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
