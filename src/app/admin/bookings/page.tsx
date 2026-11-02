import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, PageHeader, Pager, SectionTitle, StatusBadge } from '@/components/ui';
import { REQUEST_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime, formatMoney } from '@/lib/format';
import { PAGE_SIZE, parsePage, type RequestStatus } from '@/lib/rules';

export const metadata: Metadata = { title: 'Bookings & quotations' };

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireRole('admin');
  const params = await searchParams;
  const page = parsePage(params.page);

  // Admins may inspect bookings and quotations for support (FR-21). Street addresses are not shown here.
  const bookings = await query<{
    id: string; status: RequestStatus; accepted_at: Date; category_name: string;
    customer_name: string; provider_name: string; total_estimate: string; request_id: string;
  }>(
    `SELECT b.id, b.status, b.accepted_at, b.request_id, c.name AS category_name,
            cu.name AS customer_name, pu.name AS provider_name, q.total_estimate
       FROM bookings b
       JOIN service_requests r ON r.id = b.request_id
       JOIN service_categories c ON c.id = r.category_id
       JOIN users cu ON cu.id = b.customer_id
       JOIN users pu ON pu.id = b.provider_id
       JOIN quotations q ON q.id = b.quotation_id
      ORDER BY b.accepted_at DESC LIMIT $1 OFFSET $2`,
    [PAGE_SIZE + 1, (page - 1) * PAGE_SIZE],
  );
  const hasNext = bookings.length > PAGE_SIZE;
  const visibleBookings = bookings.slice(0, PAGE_SIZE);

  const quotes = await query<{
    id: string; status: string; total_estimate: string; created_at: Date; provider_name: string; category_name: string;
  }>(
    `SELECT q.id, q.status, q.total_estimate, q.created_at, u.name AS provider_name, c.name AS category_name
       FROM quotations q
       JOIN users u ON u.id = q.provider_id
       JOIN service_requests r ON r.id = q.request_id
       JOIN service_categories c ON c.id = r.category_id
      ORDER BY q.created_at DESC LIMIT 30`,
  );

  return (
    <>
      <PageHeader title="Bookings & quotations" subtitle="Support view. Use this to resolve disputes and check the quotation flow." />

      <Card>
        <SectionTitle>Bookings</SectionTitle>
        {visibleBookings.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th scope="col" className="py-2 font-medium">Accepted</th>
                  <th scope="col" className="py-2 font-medium">Service</th>
                  <th scope="col" className="py-2 font-medium">Customer</th>
                  <th scope="col" className="py-2 font-medium">Provider</th>
                  <th scope="col" className="py-2 text-right font-medium">Total (est.)</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {visibleBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2 whitespace-nowrap">{formatDateTime(b.accepted_at)}</td>
                    <td className="py-2">{b.category_name}</td>
                    <td className="py-2">{b.customer_name}</td>
                    <td className="py-2">{b.provider_name}</td>
                    <td className="py-2 text-right font-semibold">{formatMoney(b.total_estimate)}</td>
                    <td className="py-2">
                      <StatusBadge label={REQUEST_STATUS_LABELS[b.status]} tone={b.status === 'completed' ? 'green' : b.status === 'cancelled' ? 'red' : 'blue'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager basePath="/admin/bookings" page={page} hasNext={hasNext} />
      </Card>

      <Card className="mt-6">
        <SectionTitle>Latest quotations</SectionTitle>
        {quotes.length === 0 ? (
          <EmptyState title="No quotations yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th scope="col" className="py-2 font-medium">Submitted</th>
                  <th scope="col" className="py-2 font-medium">Service</th>
                  <th scope="col" className="py-2 font-medium">Provider</th>
                  <th scope="col" className="py-2 text-right font-medium">Total (est.)</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td className="py-2 whitespace-nowrap">{formatDateTime(q.created_at)}</td>
                    <td className="py-2">{q.category_name}</td>
                    <td className="py-2">{q.provider_name}</td>
                    <td className="py-2 text-right">{formatMoney(q.total_estimate)}</td>
                    <td className="py-2 capitalize">{q.status.replaceAll('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">Showing the 30 most recent quotations.</p>
      </Card>
    </>
  );
}
