import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, PageHeader, SectionTitle, Stat } from '@/components/ui';
import { linkClass } from '@/components/styles';
import { formatDateTime, formatMoney } from '@/lib/format';

export const metadata: Metadata = { title: 'Admin overview' };

export default async function AdminOverview() {
  await requireRole('admin');

  const [totals] = await query<Record<string, string | null>>(
    `SELECT
       (SELECT count(*) FROM users WHERE role = 'customer') AS customers,
       (SELECT count(*) FROM provider_profiles WHERE verification_status = 'approved') AS providers_verified,
       (SELECT count(*) FROM provider_profiles WHERE verification_status IN ('pending', 'needs_more_info')) AS providers_awaiting,
       (SELECT count(*) FROM service_requests) AS requests,
       (SELECT count(DISTINCT request_id) FROM quotations) AS requests_with_quotes,
       (SELECT count(*) FROM bookings) AS bookings,
       (SELECT count(*) FROM bookings WHERE status = 'completed') AS completed_jobs,
       (SELECT count(*) FROM bookings WHERE status = 'cancelled') AS cancelled_bookings,
       (SELECT avg(rating)::float8 FROM reviews WHERE moderation_status = 'published') AS avg_rating,
       (SELECT count(*) FROM reviews WHERE moderation_status = 'flagged') AS flagged_reviews,
       (SELECT count(*) FROM complaints WHERE status IN ('open', 'under_review')) AS open_complaints,
       (SELECT coalesce(sum(estimated_amount), 0) FROM commission_records) AS simulated_commission,
       (SELECT coalesce(sum(simulated_fee), 0) FROM promotions) AS simulated_promotions`,
  );

  const categories = await query<{ name: string; requests: string }>(
    `SELECT c.name, count(r.id) AS requests
       FROM service_categories c LEFT JOIN service_requests r ON r.category_id = c.id
      GROUP BY c.name ORDER BY requests DESC, c.name LIMIT 5`,
  );

  const providers = await query<{ name: string; completed: string; avg_rating: number | null }>(
    `SELECT u.name,
            (SELECT count(*) FROM bookings b WHERE b.provider_id = p.user_id AND b.status = 'completed') AS completed,
            (SELECT avg(rv.rating)::float8 FROM reviews rv WHERE rv.provider_id = p.user_id AND rv.moderation_status = 'published') AS avg_rating
       FROM provider_profiles p JOIN users u ON u.id = p.user_id
      WHERE p.verification_status = 'approved'
      ORDER BY completed DESC, avg_rating DESC NULLS LAST, u.name LIMIT 5`,
  );

  // Sustainability and local-employment indicators (FR-24). Based on recorded data only.
  const impact = await query<{ name: string; approved_providers: string; completed_jobs: string }>(
    `SELECT c.name,
            (SELECT count(DISTINCT s.provider_id) FROM provider_services s
               JOIN provider_profiles p ON p.user_id = s.provider_id AND p.verification_status = 'approved'
              WHERE s.category_id = c.id AND s.is_active) AS approved_providers,
            (SELECT count(*) FROM bookings b JOIN service_requests r ON r.id = b.request_id
              WHERE r.category_id = c.id AND b.status = 'completed') AS completed_jobs
       FROM service_categories c ORDER BY c.name`,
  );

  const audit = await query<{ action: string; target_type: string; created_at: Date; actor: string | null }>(
    `SELECT a.action, a.target_type, a.created_at, u.name AS actor
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC LIMIT 15`,
  );

  const requests = num(totals?.requests);
  const withQuotes = num(totals?.requests_with_quotes);
  const acceptanceRate = withQuotes > 0 ? Math.round((num(totals?.bookings) / withQuotes) * 100) : 0;

  return (
    <>
      <PageHeader title="Admin overview" subtitle="Platform health at a glance. Revenue figures are simulated for the academic prototype." />

      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">Key figures</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
          <Stat label="Customers" value={num(totals?.customers)} />
          <Stat label="Verified providers" value={num(totals?.providers_verified)} hint={`${num(totals?.providers_awaiting)} awaiting review`} />
          <Stat label="Requests" value={requests} hint={`${withQuotes} received quotations`} />
          <Stat label="Quotation acceptance rate" value={`${acceptanceRate}%`} hint="Requests with a booking ÷ requests with quotes" />
          <Stat label="Completed jobs" value={num(totals?.completed_jobs)} hint={`${num(totals?.cancelled_bookings)} cancelled`} />
          <Stat label="Average rating" value={totals?.avg_rating ? `${num(totals.avg_rating).toFixed(2)} ★` : '—'} />
          <Stat label="Open complaints" value={num(totals?.open_complaints)} hint={`${num(totals?.flagged_reviews)} flagged reviews`} />
          <Stat label="Commission (simulated)" value={formatMoney(totals?.simulated_commission)} hint="Estimate only. No payments are collected." />
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Popular categories</SectionTitle>
          <ol className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.name} className="flex justify-between gap-3 border-b border-blue-50 pb-2">
                <span>{c.name}</span>
                <span className="font-semibold">{num(c.requests)} requests</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <SectionTitle>Top providers</SectionTitle>
          {providers.length === 0 ? (
            <p className="text-sm text-slate-600">No verified providers yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {providers.map((p) => (
                <li key={p.name} className="flex justify-between gap-3 border-b border-blue-50 pb-2">
                  <span>{p.name}</span>
                  <span className="text-slate-700">{num(p.completed)} completed · {p.avg_rating ? `${Number(p.avg_rating).toFixed(1)} ★` : 'no reviews'}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <SectionTitle>Sustainability and local employment (estimates labelled)</SectionTitle>
        <p className="mb-3 text-sm text-slate-600">
          Digital records (requests, quotations, verifications and reviews) are created in the app instead of on paper: {requests + withQuotes + num(totals?.bookings)} recorded so far.
          Figures below come directly from recorded data.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th scope="col" className="py-2 font-medium">Service category</th>
                <th scope="col" className="py-2 text-right font-medium">Verified providers</th>
                <th scope="col" className="py-2 text-right font-medium">Completed jobs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {impact.map((row) => (
                <tr key={row.name}>
                  <td className="py-2">{row.name}</td>
                  <td className="py-2 text-right">{num(row.approved_providers)}</td>
                  <td className="py-2 text-right">{num(row.completed_jobs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle>Recent admin activity</SectionTitle>
          <Link href="/admin/verification" className={linkClass}>Go to verification queue</Link>
        </div>
        {audit.length === 0 ? (
          <p className="text-sm text-slate-600">No recorded actions yet.</p>
        ) : (
          <ul className="divide-y divide-blue-100 text-sm">
            {audit.map((a, i) => (
              <li key={i} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between">
                <span className="font-medium text-slate-800">{a.action}</span>
                <span className="text-slate-500">{a.actor ?? 'System'} · {a.target_type} · {formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
