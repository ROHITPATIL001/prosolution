import type { Metadata } from 'next';
import { moderateReviewAction } from '@/app/actions/admin';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Flash, PageHeader, SectionTitle, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Review moderation' };

export default async function ReviewModerationPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole('admin');
  const flash = await searchParams;

  // Flagged reviews first, then the most recent published or hidden reviews.
  const reviews = await query<{
    id: string; rating: number; review_text: string | null; moderation_status: string; created_at: Date;
    customer_name: string; provider_name: string;
  }>(
    `SELECT r.id, r.rating, r.review_text, r.moderation_status, r.created_at,
            cu.name AS customer_name, pu.name AS provider_name
       FROM reviews r
       JOIN users cu ON cu.id = r.customer_id
       JOIN users pu ON pu.id = r.provider_id
      ORDER BY (r.moderation_status = 'flagged') DESC, r.created_at DESC
      LIMIT 60`,
  );

  return (
    <>
      <PageHeader title="Review moderation" subtitle="Reviews come only from completed bookings. Flagged reviews need a decision." />
      <Flash ok={flash.ok} error={flash.error} />

      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" />
      ) : (
        <Card>
          <SectionTitle>Reviews</SectionTitle>
          <ul className="divide-y divide-blue-100">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-amber-600">{'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span></p>
                    <StatusBadge
                      label={r.moderation_status}
                      tone={r.moderation_status === 'flagged' ? 'amber' : r.moderation_status === 'hidden' ? 'red' : 'green'}
                    />
                  </div>
                  <p className="text-sm text-slate-800">{r.review_text ?? <em className="text-slate-500">No text</em>}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.customer_name} about {r.provider_name} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.moderation_status !== 'published' ? (
                    <form action={moderateReviewAction}>
                      <input type="hidden" name="review_id" value={r.id} />
                      <input type="hidden" name="status" value="published" />
                      <SubmitButton variant="secondary" pendingLabel="…" className="min-h-9 px-3 py-1 text-sm">Publish</SubmitButton>
                    </form>
                  ) : null}
                  {r.moderation_status !== 'hidden' ? (
                    <form action={moderateReviewAction}>
                      <input type="hidden" name="review_id" value={r.id} />
                      <input type="hidden" name="status" value="hidden" />
                      <SubmitButton variant="danger" pendingLabel="…" className="min-h-9 px-3 py-1 text-sm">Hide</SubmitButton>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
