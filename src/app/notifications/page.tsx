import type { Metadata } from 'next';
import Link from 'next/link';
import { markNotificationsReadAction } from '@/app/actions/shared';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Flash, PageHeader, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireUser();
  const flash = await searchParams;

  const items = await query<{ id: string; title: string; body: string | null; target_url: string | null; read_at: Date | null; created_at: Date }>(
    `SELECT id, title, body, target_url, read_at, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [user.id],
  );

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Updates about quotations, messages, bookings and verification."
        action={
          items.some((i) => !i.read_at) ? (
            <form action={markNotificationsReadAction}>
              <SubmitButton variant="secondary" pendingLabel="Updating…">Mark all as read</SubmitButton>
            </form>
          ) : null
        }
      />
      <Flash ok={flash.ok} error={flash.error} />

      {items.length === 0 ? (
        <EmptyState title="You are all caught up" />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const content = (
              <Card className={n.read_at ? '' : 'border-blue-400 bg-blue-50/50'}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    {n.body ? <p className="mt-1 text-sm text-slate-700">{n.body}</p> : null}
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
                  </div>
                  {!n.read_at ? <StatusBadge label="New" /> : null}
                </div>
              </Card>
            );
            return (
              <li key={n.id}>
                {n.target_url ? <Link href={n.target_url} className="block rounded-2xl">{content}</Link> : content}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
