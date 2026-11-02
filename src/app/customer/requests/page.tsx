import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, EmptyState, Flash, PageHeader, Pager, StatusBadge } from '@/components/ui';
import { buttonClass } from '@/components/styles';
import { REQUEST_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime, formatMoney } from '@/lib/format';
import { PAGE_SIZE, parsePage, type RequestStatus } from '@/lib/rules';
import { CategoryIcon } from '@/components/category-icon';
import { Plus, ArrowRight, ClipboardList, Coins } from 'lucide-react';

export const metadata: Metadata = { title: 'My Requests' };

export default async function CustomerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; page?: string }>;
}) {
  const user = await requireRole('customer');
  const params = await searchParams;
  const page = parsePage(params.page);

  const rows = await query<{
    id: string;
    description: string;
    status: RequestStatus;
    created_at: Date;
    category_name: string;
    quote_count: string;
    booked_total: string | null;
  }>(
    `SELECT r.id, r.description, r.status, r.created_at, c.name AS category_name,
            (SELECT count(*) FROM quotations q WHERE q.request_id = r.id) AS quote_count,
            (SELECT q.total_estimate FROM bookings b JOIN quotations q ON q.id = b.quotation_id WHERE b.request_id = r.id) AS booked_total
       FROM service_requests r JOIN service_categories c ON c.id = r.category_id
      WHERE r.customer_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3`,
    [user.id, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE],
  );
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        subtitle="Manage your posted jobs, compare incoming FairQuotes, and track your active bookings."
        action={
          <Link href="/customer/requests/new" className={buttonClass}>
            <Plus className="h-4 w-4" />
            <span>New request</span>
          </Link>
        }
      />
      <Flash ok={params.ok} error={params.error} />

      {visible.length === 0 ? (
        <EmptyState
          title="You have not posted any requests yet"
          icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
        >
          <p className="mb-4">Describe the job you need help with. Verified providers will send you itemized FairQuotes.</p>
          <Link href="/customer/requests/new" className={buttonClass}>
            <Plus className="h-4 w-4" />
            <span>Post your first request</span>
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const quoteCount = num(r.quote_count);
            return (
              <Link key={r.id} href={`/customer/requests/${r.id}`} className="group block">
                <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <CategoryIcon name={r.category_name} className="h-5 w-5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-base font-bold text-slate-900 group-hover:text-blue-700 transition">
                            {r.category_name}
                          </h2>
                          <StatusBadge
                            label={REQUEST_STATUS_LABELS[r.status]}
                            tone={r.status === 'completed' ? 'green' : r.status === 'cancelled' ? 'red' : 'blue'}
                          />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {r.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition mt-1" />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 font-medium">
                      <span>{formatDateTime(r.created_at)}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">
                        {quoteCount} {quoteCount === 1 ? 'quotation' : 'quotations'}
                      </span>
                    </div>
                    {r.booked_total ? (
                      <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Coins className="h-3.5 w-3.5 text-emerald-600" />
                        Booked: {formatMoney(r.booked_total)}
                      </span>
                    ) : null}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Pager basePath="/customer/requests" page={page} hasNext={hasNext} />
    </div>
  );
}
