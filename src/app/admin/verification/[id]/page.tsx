import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { decideVerificationAction } from '@/app/actions/admin';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/errors';
import { Card, Field, Flash, PageHeader, SectionTitle, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, linkClass } from '@/components/styles';
import { DOCUMENT_TYPE_LABELS, VERIFICATION_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Review provider' };

export default async function VerificationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const flash = await searchParams;
  if (!isUuid(id)) notFound();

  const [provider] = await query<{
    user_id: string; name: string; email: string; bio: string | null; skills: string[];
    phone: string | null; service_area: string | null; street_address: string | null;
    verification_status: string; verification_decided_at: Date | null;
  }>(
    `SELECT p.user_id, u.name, u.email, p.bio, p.skills, p.phone, p.service_area, p.street_address,
            p.verification_status, p.verification_decided_at
       FROM provider_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1`,
    [id],
  );
  if (!provider) notFound();

  const documents = await query<{
    id: string; document_type: string; original_name: string; review_status: string;
    uploaded_at: Date; review_notes: string | null;
  }>(
    `SELECT id, document_type, original_name, review_status, uploaded_at, review_notes
       FROM provider_documents WHERE provider_id = $1 ORDER BY uploaded_at DESC`,
    [id],
  );

  // Decision history from the audit trail (Section 15: record verification decisions).
  const history = await query<{ action: string; created_at: Date; actor: string | null; metadata_json: { notes?: string } }>(
    `SELECT a.action, a.created_at, u.name AS actor, a.metadata_json
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE a.target_type = 'provider' AND a.target_id = $1 AND a.action LIKE 'verification.%'
      ORDER BY a.created_at DESC LIMIT 20`,
    [id],
  );

  const status = provider.verification_status;

  return (
    <>
      <PageHeader
        title={provider.name}
        subtitle={provider.email}
        action={
          <StatusBadge
            label={VERIFICATION_LABELS[status] ?? status}
            tone={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'amber'}
          />
        }
      />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle>Application details</SectionTitle>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{provider.phone ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Service area</dt><dd className="font-medium">{provider.service_area ?? '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Street address (admin only)</dt><dd className="font-medium">{provider.street_address ?? '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Bio</dt><dd className="font-medium">{provider.bio ?? '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Skills</dt><dd className="font-medium">{provider.skills.length ? provider.skills.join(', ') : '—'}</dd></div>
            </dl>
          </Card>

          <Card>
            <SectionTitle>Submitted documents</SectionTitle>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-600">No documents uploaded. An application cannot be approved without at least one document.</p>
            ) : (
              <ul className="divide-y divide-blue-100">
                {documents.map((d) => (
                  <li key={d.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type}</p>
                        <p className="truncate text-sm text-slate-600">{d.original_name} · uploaded {formatDateTime(d.uploaded_at)}</p>
                      </div>
                      <StatusBadge label={VERIFICATION_LABELS[d.review_status] ?? d.review_status} tone={d.review_status === 'approved' ? 'green' : d.review_status === 'rejected' ? 'red' : 'blue'} />
                    </div>
                    <a href={`/api/files/provider-document/${d.id}`} target="_blank" rel="noopener" className={`${linkClass} mt-2 inline-block text-sm`}>
                      Open document (logged view)
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle>Decision history</SectionTitle>
            {history.length === 0 ? (
              <p className="text-sm text-slate-600">No decisions recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.map((h, i) => (
                  <li key={i} className="border-b border-blue-50 pb-2">
                    <span className="font-semibold">{h.action.replace('verification.', '').replaceAll('_', ' ')}</span>
                    {' · '}{h.actor ?? 'Administrator'} · {formatDateTime(h.created_at)}
                    {h.metadata_json?.notes ? <p className="text-slate-600">Notes: {h.metadata_json.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit lg:col-span-1">
          <SectionTitle>Record a decision</SectionTitle>
          <p className="mb-4 text-xs text-slate-500">
            Approving marks the provider as Verified. This means you reviewed the submitted information only.
          </p>
          <form action={decideVerificationAction} className="space-y-4">
            <input type="hidden" name="provider_id" value={provider.user_id} />
            <Field label="Decision" htmlFor="decision">
              <select id="decision" name="decision" required defaultValue="" className={inputClass}>
                <option value="" disabled>Choose a decision</option>
                <option value="approved">Approve</option>
                <option value="needs_more_info">Request more information</option>
                <option value="rejected">Reject</option>
              </select>
            </Field>
            <Field label="Notes" htmlFor="notes" hint="Required for rejection or a request for more information. Shown to the provider.">
              <textarea id="notes" name="notes" rows={4} maxLength={1000} className={inputClass} />
            </Field>
            <SubmitButton pendingLabel="Recording…" className="w-full">Save decision</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
