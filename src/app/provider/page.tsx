import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, PageHeader, SectionTitle, Stat } from '@/components/ui';
import { linkClass, secondaryButtonClass } from '@/components/styles';
import { VERIFICATION_LABELS } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import type { VerificationStatus } from '@/lib/rules';

export const metadata: Metadata = { title: 'Provider dashboard' };

export default async function ProviderDashboard() {
  const user = await requireRole('provider');

  const [profile] = await query<{ verification_status: VerificationStatus; avg_rating: number; review_count: number }>(
    `SELECT p.verification_status,
            COALESCE((SELECT avg(rating)::float8 FROM reviews r WHERE r.provider_id = p.user_id AND r.moderation_status = 'published'), 0) AS avg_rating,
            (SELECT count(*)::int FROM reviews r WHERE r.provider_id = p.user_id AND r.moderation_status = 'published') AS review_count
       FROM provider_profiles p WHERE p.user_id = $1`,
    [user.id],
  );

  const [stats] = await query<{ open_requests: string; active_jobs: string; completed_jobs: string; earnings: string | null }>(
    `SELECT
       (SELECT count(*) FROM service_requests r
         WHERE r.status IN ('submitted', 'quotations_received')
           AND r.customer_id <> $1
           AND r.category_id IN (SELECT category_id FROM provider_services WHERE provider_id = $1 AND is_active)
           AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.request_id = r.id AND q.provider_id = $1)) AS open_requests,
       (SELECT count(*) FROM bookings WHERE provider_id = $1 AND status IN ('quotation_accepted', 'provider_on_the_way', 'work_in_progress')) AS active_jobs,
       (SELECT count(*) FROM bookings WHERE provider_id = $1 AND status = 'completed') AS completed_jobs,
       (SELECT sum(q.total_estimate) FROM bookings b JOIN quotations q ON q.id = b.quotation_id
         WHERE b.provider_id = $1 AND b.status = 'completed') AS earnings`,
    [user.id],
  );

  const status = profile?.verification_status ?? 'pending';

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Respond to requests, manage bookings and keep your WorkProof up to date." />

      {status !== 'approved' ? (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-900">Verification: {VERIFICATION_LABELS[status]}</p>
              <p className="text-sm text-amber-900/80">
                You can prepare your profile now. Quotations open once ProSolution approves your documents.
              </p>
            </div>
            <Link href="/provider/documents" className={secondaryButtonClass}>Upload documents</Link>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
        <Stat label="Open matching requests" value={num(stats?.open_requests)} />
        <Stat label="Active jobs" value={num(stats?.active_jobs)} />
        <Stat label="Completed jobs" value={num(stats?.completed_jobs)} />
        <Stat
          label="Average rating"
          value={profile && num(profile.review_count) > 0 ? `${num(profile.avg_rating).toFixed(1)} ★` : '—'}
          hint={`${num(profile?.review_count)} published review${num(profile?.review_count) === 1 ? '' : 's'}`}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>Next steps</SectionTitle>
          <ul className="space-y-3 text-sm text-slate-700">
            <li>1. <Link href="/provider/profile" className={linkClass}>Complete your profile, services and prices</Link></li>
            <li>2. <Link href="/provider/requests" className={linkClass}>Send quotations to open requests</Link></li>
            <li>3. <Link href="/provider/bookings" className={linkClass}>Update job progress for accepted bookings</Link></li>
          </ul>
        </Card>
        <Card>
          <SectionTitle>Estimated earnings</SectionTitle>
          <p className="text-2xl font-bold text-slate-900">{formatMoney(stats?.earnings ?? 0)}</p>
          <p className="mt-1 text-sm text-slate-600">Total quoted value of completed jobs. An estimate, not a payout record. Customers pay you directly.</p>
          <Link href="/provider/earnings" className={`${linkClass} mt-3 inline-block`}>View earnings details</Link>
        </Card>
      </div>
    </>
  );
}
