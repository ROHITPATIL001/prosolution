import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, EmptyState, Flash, PageHeader, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireUser();
  const flash = await searchParams;

  const conversations = await query<{
    id: string; description: string; other_name: string; last_body: string | null;
    last_at: Date | null; unread: string;
  }>(
    `SELECT c.id, r.description,
            CASE WHEN c.customer_id = $1 THEN pu.name ELSE cu.name END AS other_name,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
            (SELECT max(m.created_at) FROM messages m WHERE m.conversation_id = c.id) AS last_at,
            (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_id <> $1) AS unread
       FROM conversations c
       JOIN service_requests r ON r.id = c.request_id
       JOIN users cu ON cu.id = c.customer_id
       JOIN users pu ON pu.id = c.provider_id
      WHERE c.customer_id = $1 OR c.provider_id = $1
      ORDER BY last_at DESC NULLS LAST, c.created_at DESC
      LIMIT 100`,
    [user.id],
  );

  return (
    <>
      <PageHeader title="Messages" subtitle="Talk to customers and providers about a request before a quotation is accepted." />
      <Flash ok={flash.ok} error={flash.error} />

      {conversations.length === 0 ? (
        <EmptyState title="No conversations yet">
          Messaging opens from a request once a provider has sent a quotation.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="block">
                <Card className="transition hover:border-blue-300">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="truncate font-semibold text-slate-900">{c.other_name}</h2>
                    {num(c.unread) > 0 ? <StatusBadge label={`${num(c.unread)} new`} /> : null}
                  </div>
                  <p className="truncate text-sm text-slate-500">{c.description}</p>
                  {c.last_body ? <p className="mt-1 line-clamp-1 text-sm text-slate-700">{c.last_body}</p> : null}
                  {c.last_at ? <p className="mt-2 text-xs text-slate-500">{formatDateTime(c.last_at)}</p> : null}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
