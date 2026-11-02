import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, EmptyState, PageHeader, SectionTitle, Stat } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { COMMISSION_RATE } from '@/lib/constants';

export const metadata: Metadata = { title: 'Earnings' };

export default async function EarningsPage() {
  const user = await requireRole('provider');

  const jobs = await query<{ id: string; category_name: string; completed_at: Date; total_estimate: string; commission: string | null }>(
    `SELECT b.id, c.name AS category_name, b.completed_at, q.total_estimate, cr.estimated_amount AS commission
       FROM bookings b
       JOIN service_requests r ON r.id = b.request_id
       JOIN service_categories c ON c.id = r.category_id
       JOIN quotations q ON q.id = b.quotation_id
       LEFT JOIN commission_records cr ON cr.booking_id = b.id
      WHERE b.provider_id = $1 AND b.status = 'completed'
      ORDER BY b.completed_at DESC LIMIT 100`,
    [user.id],
  );

  const gross = jobs.reduce((sum, j) => sum + num(j.total_estimate), 0);
  const commission = jobs.reduce((sum, j) => sum + num(j.commission), 0);

  return (
    <>
      <PageHeader
        title="Earnings estimates"
        subtitle="Figures are estimates based on your completed quotations. Customers pay you directly."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Completed jobs" value={jobs.length} />
        <Stat label="Quoted value (est.)" value={formatMoney(gross)} hint="Sum of accepted quotation totals" />
        <Stat
          label="Platform fee (simulated)"
          value={formatMoney(commission)}
          hint={`Simulated at ${(COMMISSION_RATE * 100).toFixed(0)}%. No money is collected by ProSolution in this prototype.`}
        />
      </div>

      <Card className="mt-6">
        <SectionTitle>Completed jobs</SectionTitle>
        {jobs.length === 0 ? (
          <EmptyState title="No completed jobs yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th scope="col" className="py-2 font-medium">Completed</th>
                  <th scope="col" className="py-2 font-medium">Service</th>
                  <th scope="col" className="py-2 text-right font-medium">Quoted (est.)</th>
                  <th scope="col" className="py-2 text-right font-medium">Platform fee (sim.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="py-2">{formatDate(j.completed_at)}</td>
                    <td className="py-2">{j.category_name}</td>
                    <td className="py-2 text-right font-semibold">{formatMoney(j.total_estimate)}</td>
                    <td className="py-2 text-right">{j.commission ? formatMoney(j.commission) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
