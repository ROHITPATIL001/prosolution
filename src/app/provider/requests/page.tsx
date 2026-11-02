import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Flash, PageHeader, Pager, StatusBadge } from '@/components/ui';
import { formatDateTime, formatKm } from '@/lib/format';
import { PAGE_SIZE, distanceKm, parsePage } from '@/lib/rules';

export const metadata: Metadata = { title: 'Open requests' };

type RequestRow = {
  id: string;
  description: string;
  area: string;
  preferred_at: Date | null;
  created_at: Date;
  category_name: string;
  has_quote: boolean;
  provider_lat: number | null;
  provider_lng: number | null;
  request_lat: number | null;
  request_lng: number | null;
};

export default async function ProviderRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; page?: string }>;
}) {
  const user = await requireRole('provider');
  const params = await searchParams;
  const page = parsePage(params.page);

  // Providers see requests for categories they offer. The street address is never included (Section 9).
  const rows = await query<RequestRow>(
    `SELECT r.id, r.description, r.area, r.preferred_at, r.created_at, c.name AS category_name,
            EXISTS (SELECT 1 FROM quotations q WHERE q.request_id = r.id AND q.provider_id = $1) AS has_quote,
            p.latitude AS provider_lat, p.longitude AS provider_lng,
            r.latitude AS request_lat, r.longitude AS request_lng
       FROM service_requests r
       JOIN service_categories c ON c.id = r.category_id
       JOIN provider_profiles p ON p.user_id = $1
      WHERE r.status IN ('submitted', 'quotations_received')
        AND r.customer_id <> $1
        AND r.category_id IN (SELECT category_id FROM provider_services WHERE provider_id = $1 AND is_active)
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3`,
    [user.id, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE],
  );
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  return (
    <>
      <PageHeader title="Open requests" subtitle="Requests in the services you offer. Send a quotation to be considered." />
      <Flash ok={params.ok} error={params.error} />

      {visible.length === 0 ? (
        <EmptyState title="No open requests right now">
          Make sure your services and prices are active on your <Link href="/provider/profile" className="font-semibold text-blue-700 underline">profile</Link>.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => {
            const km =
              r.provider_lat !== null && r.provider_lng !== null && r.request_lat !== null && r.request_lng !== null
                ? distanceKm(r.provider_lat, r.provider_lng, r.request_lat, r.request_lng)
                : null;
            return (
              <li key={r.id}>
                <Link href={`/provider/requests/${r.id}`} className="block">
                  <Card className="transition hover:border-blue-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-900">{r.category_name}</h2>
                      {r.has_quote ? <StatusBadge label="Quoted" tone="green" /> : <StatusBadge label="New" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.description}</p>
                    <p className="mt-3 text-sm text-slate-500">
                      {r.area}{km !== null ? ` · about ${formatKm(km)} away` : ''} · Posted {formatDateTime(r.created_at)}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pager basePath="/provider/requests" page={page} hasNext={hasNext} />
    </>
  );
}
