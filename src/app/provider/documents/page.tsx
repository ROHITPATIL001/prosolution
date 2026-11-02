import type { Metadata } from 'next';
import { uploadDocumentAction } from '@/app/actions/provider';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Field, Flash, PageHeader, SectionTitle, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, linkClass } from '@/components/styles';
import { DOCUMENT_TYPE_LABELS, VERIFICATION_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { maxUploadBytes } from '@/lib/storage';
import type { VerificationStatus } from '@/lib/rules';

export const metadata: Metadata = { title: 'Verification documents' };

const DOC_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue'> = {
  approved: 'green',
  rejected: 'red',
  needs_more_info: 'amber',
  pending: 'blue',
};

export default async function ProviderDocumentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireRole('provider');
  const flash = await searchParams;

  const [profile] = await query<{ verification_status: VerificationStatus; verification_decided_at: Date | null }>(
    `SELECT verification_status, verification_decided_at FROM provider_profiles WHERE user_id = $1`,
    [user.id],
  );
  const documents = await query<{
    id: string; document_type: string; original_name: string; review_status: string;
    uploaded_at: Date; reviewed_at: Date | null; review_notes: string | null;
  }>(
    `SELECT id, document_type, original_name, review_status, uploaded_at, reviewed_at, review_notes
       FROM provider_documents WHERE provider_id = $1 ORDER BY uploaded_at DESC`,
    [user.id],
  );

  const status = profile?.verification_status ?? 'pending';
  const maxMb = Math.round(maxUploadBytes() / (1024 * 1024));

  return (
    <>
      <PageHeader
        title="Verification"
        subtitle="Upload certificates or identity documents. Only ProSolution administrators can view them."
      />
      <Flash ok={flash.ok} error={flash.error} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-slate-700">Application status:</p>
          <StatusBadge label={VERIFICATION_LABELS[status]} tone={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : status === 'needs_more_info' ? 'amber' : 'blue'} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          A verified badge means ProSolution reviewed the documents you submitted. It is not a guarantee of your skill, safety or legal certification.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle>Upload a document</SectionTitle>
          <form action={uploadDocumentAction} encType="multipart/form-data" className="space-y-4">
            <Field label="Document type" htmlFor="document_type">
              <select id="document_type" name="document_type" required defaultValue="" className={inputClass}>
                <option value="" disabled>Choose a type</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="File" htmlFor="document" hint={`PDF, JPG or PNG, up to ${maxMb} MB.`}>
              <input
                id="document"
                name="document"
                type="file"
                required
                accept="application/pdf,image/jpeg,image/png"
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-semibold file:text-blue-900"
              />
            </Field>
            <SubmitButton pendingLabel="Uploading…" className="w-full">Upload document</SubmitButton>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>Your documents</SectionTitle>
          {documents.length === 0 ? (
            <EmptyState title="No documents uploaded yet">Your application stays pending until you upload at least one document.</EmptyState>
          ) : (
            <ul className="divide-y divide-blue-100">
              {documents.map((d) => (
                <li key={d.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type}</p>
                      <p className="truncate text-sm text-slate-600">{d.original_name}</p>
                    </div>
                    <StatusBadge label={VERIFICATION_LABELS[d.review_status as VerificationStatus] ?? d.review_status} tone={DOC_TONE[d.review_status] ?? 'blue'} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Uploaded {formatDate(d.uploaded_at)}{d.reviewed_at ? ` · reviewed ${formatDate(d.reviewed_at)}` : ''}
                  </p>
                  {d.review_notes ? (
                    <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Reviewer notes: {d.review_notes}</p>
                  ) : null}
                  <a href={`/api/files/provider-document/${d.id}`} target="_blank" rel="noopener" className={`${linkClass} mt-2 inline-block text-sm`}>
                    View file
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
