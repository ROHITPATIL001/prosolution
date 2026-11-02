import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Flash, PageHeader, Pager, StatusBadge } from '@/components/ui';
import { REQUEST_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';
import { PAGE_SIZE, parsePage, type RequestStatus } from '@/lib/rules';

export const metadata: Metadata = { title: 'Bookings' };

export default async function ProviderBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; page?: string }>;
}) {
  const user = await requireRole('provider');
  const params = await searchParams;
  const page = parsePage(params.page);

  const rows = await query<{
    id: string; status: RequestStatus; accepted_at: Date; description: string;
    category_name: string; total_estimate: string; area: string;
  }>(
    `SELECT b.id, b.status, b.accepted_at, r.description, r.area, c.name AS category_name, q.total_estimate
       FROM bookings b
       JOIN service_requests r ON r.id = b.request_id
       JOIN service_categories c ON c.id = r.category_id
       JOIN quotations q ON q.id = b.quotation_id
      WHERE b.provider_id = $1
      ORDER BY b.accepted_at DESC
      LIMIT $2 OFFSET $3`,
    [user.id, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE],
  );
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  return (
    <>
      <PageHeader title="Bookings" subtitle="Accepted jobs. Update each step as the work progresses." />
      <Flash ok={params.ok} error={params.error} />

      {visible.length === 0 ? (
        <EmptyState title="No bookings yet">Bookings appear here when a customer accepts your quotation.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map((b) => (
            <li key={b.id}>
              <Link href={`/provider/bookings/${b.id}`} className="block">
                <Card className="transition hover:border-blue-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{b.category_name} · {b.area}</h2>
                    <StatusBadge
                      label={REQUEST_STATUS_LABELS[b.status]}
                      tone={b.status === 'completed' ? 'green' : b.status === 'cancelled' ? 'red' : 'blue'}
                    />
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-600">{b.description}</p>
                  <p className="mt-2 text-sm text-slate-500">Accepted {formatDate(b.accepted_at)} · {formatMoney(b.total_estimate)} (estimate)</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager basePath="/provider/bookings" page={page} hasNext={hasNext} />
    </>
  );
}
