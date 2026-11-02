import type { Metadata } from 'next';
import { createPromotionAction, endPromotionAction } from '@/app/actions/admin';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, EmptyState, Field, Flash, PageHeader, SectionTitle, Stat, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass } from '@/components/styles';
import { COMMISSION_RATE } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';

export const metadata: Metadata = { title: 'Promotions & revenue' };

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole('admin');
  const flash = await searchParams;

  const providers = await query<{ user_id: string; name: string }>(
    `SELECT p.user_id, u.name FROM provider_profiles p JOIN users u ON u.id = p.user_id
      WHERE p.verification_status = 'approved' ORDER BY u.name LIMIT 200`,
  );
  const promotions = await query<{
    id: string; campaign_name: string; provider_name: string; start_at: Date; end_at: Date; status: string; simulated_fee: string;
  }>(
    `SELECT pr.id, pr.campaign_name, u.name AS provider_name, pr.start_at, pr.end_at, pr.status, pr.simulated_fee
       FROM promotions pr JOIN users u ON u.id = pr.provider_id
      ORDER BY pr.created_at DESC LIMIT 50`,
  );

  // Commission report by month (FR-23). Simulated amounts only.
  const monthly = await query<{ month: string; bookings: string; commission: string }>(
    `SELECT to_char(date_trunc('month', cr.created_at), 'YYYY-MM') AS month,
            count(*) AS bookings, sum(cr.estimated_amount) AS commission
       FROM commission_records cr
      GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
  );
  const totalCommission = monthly.reduce((sum, m) => sum + num(m.commission), 0);
  const totalPromotionFees = promotions.reduce((sum, p) => sum + num(p.simulated_fee), 0);

  return (
    <>
      <PageHeader
        title="Promotions & revenue"
        subtitle="Simulated business-model reporting for the academic prototype. No payments are collected."
      />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Commission (simulated)" value={formatMoney(totalCommission)} hint={`At ${(COMMISSION_RATE * 100).toFixed(0)}% of completed job totals`} />
        <Stat label="Promotion fees (simulated)" value={formatMoney(totalPromotionFees)} />
        <Stat label="Promoted listings" value={promotions.filter((p) => p.status === 'active').length} hint="Shown with a Promoted label" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle>Create a promotion</SectionTitle>
          <form action={createPromotionAction} className="space-y-4">
            <Field label="Provider" htmlFor="provider_id">
              <select id="provider_id" name="provider_id" required defaultValue="" className={inputClass}>
                <option value="" disabled>Choose a verified provider</option>
                {providers.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Campaign name" htmlFor="campaign_name">
              <input id="campaign_name" name="campaign_name" type="text" required maxLength={120} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="start_at"><input id="start_at" name="start_at" type="date" required className={inputClass} /></Field>
              <Field label="End" htmlFor="end_at"><input id="end_at" name="end_at" type="date" required className={inputClass} /></Field>
            </div>
            <Field label="Simulated fee" htmlFor="simulated_fee" hint="Recorded for reporting only.">
              <input id="simulated_fee" name="simulated_fee" type="number" min={0} step="0.01" inputMode="decimal" required className={inputClass} />
            </Field>
            <SubmitButton pendingLabel="Saving…" className="w-full">Record promotion</SubmitButton>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>Promotions</SectionTitle>
          {promotions.length === 0 ? (
            <EmptyState title="No promotions recorded" />
          ) : (
            <ul className="divide-y divide-blue-100">
              {promotions.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{p.campaign_name} <span className="text-sm font-normal text-slate-600">· {p.provider_name}</span></p>
                    <p className="text-xs text-slate-500">{formatDate(p.start_at)} to {formatDate(p.end_at)} · simulated fee {formatMoney(p.simulated_fee)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={p.status === 'active' ? 'Promoted' : 'Ended'} tone={p.status === 'active' ? 'amber' : 'slate'} />
                    {p.status === 'active' ? (
                      <form action={endPromotionAction}>
                        <input type="hidden" name="promotion_id" value={p.id} />
                        <SubmitButton variant="secondary" pendingLabel="…" className="min-h-9 px-3 py-1 text-sm">End</SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 border-t border-blue-100 pt-4">
            <SectionTitle>Commission by month (simulated)</SectionTitle>
            {monthly.length === 0 ? (
              <p className="text-sm text-slate-600">No completed bookings yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th scope="col" className="py-2 font-medium">Month</th>
                    <th scope="col" className="py-2 text-right font-medium">Completed bookings</th>
                    <th scope="col" className="py-2 text-right font-medium">Commission (est.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {monthly.map((m) => (
                    <tr key={m.month}>
                      <td className="py-2">{m.month}</td>
                      <td className="py-2 text-right">{num(m.bookings)}</td>
                      <td className="py-2 text-right">{formatMoney(m.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
