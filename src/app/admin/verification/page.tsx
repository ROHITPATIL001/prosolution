import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { VERIFICATION_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Verification queue' };

const FILTERS = ['pending', 'needs_more_info', 'approved', 'rejected', 'all'] as const;

export default async function VerificationQueuePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole('admin');
  const params = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(params.status ?? '') ? params.status! : 'pending';

  const rows = await query<{
    user_id: string; name: string; email: string; verification_status: string;
    document_count: string; submitted_at: Date | null; service_area: string | null;
  }>(
    `SELECT p.user_id, u.name, u.email, p.verification_status, p.service_area,
            (SELECT count(*) FROM provider_documents d WHERE d.provider_id = p.user_id) AS document_count,
            (SELECT max(d.uploaded_at) FROM provider_documents d WHERE d.provider_id = p.user_id) AS submitted_at
       FROM provider_profiles p JOIN users u ON u.id = p.user_id
      WHERE ($1 = 'all' OR p.verification_status = $1)
      ORDER BY submitted_at DESC NULLS LAST, u.name
      LIMIT 100`,
    [filter],
  );

  return (
    <>
      <PageHeader title="Verification queue" subtitle="Review documents and record a decision. Only administrators can change verification status." />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/verification?status=${f}`}
            aria-current={filter === f ? 'page' : undefined}
            className={`min-h-9 rounded-full px-3 py-1.5 text-sm font-semibold ${filter === f ? 'bg-blue-700 text-white' : 'bg-white text-blue-800 ring-1 ring-blue-200 hover:bg-blue-50'}`}
          >
            {f === 'all' ? 'All' : VERIFICATION_LABELS[f]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="Nothing in this queue" />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.user_id}>
              <Link href={`/admin/verification/${r.user_id}`} className="block">
                <Card className="transition hover:border-blue-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{r.name}</h2>
                    <StatusBadge
                      label={VERIFICATION_LABELS[r.verification_status] ?? r.verification_status}
                      tone={r.verification_status === 'approved' ? 'green' : r.verification_status === 'rejected' ? 'red' : 'amber'}
                    />
                  </div>
                  <p className="text-sm text-slate-600">{r.email} · {r.service_area ?? 'No area set'}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {num(r.document_count)} document{num(r.document_count) === 1 ? '' : 's'}
                    {r.submitted_at ? ` · last upload ${formatDate(r.submitted_at)}` : ''}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
