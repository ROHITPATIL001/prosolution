import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sendMessageAction } from '@/app/actions/shared';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/errors';
import { Card, Field, Flash, PageHeader, StatusBadge, Avatar } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, linkClass } from '@/components/styles';
import { formatDateTime } from '@/lib/format';
import { CategoryIcon } from '@/components/category-icon';
import { Send, ShieldCheck, ArrowRight, MessageSquare, Info } from 'lucide-react';

export const metadata: Metadata = { title: 'Conversation' };

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const flash = await searchParams;
  if (!isUuid(id)) notFound();

  const [conversation] = await query<{
    id: string;
    customer_id: string;
    provider_id: string;
    request_id: string;
    description: string;
    category_name: string;
    customer_name: string;
    provider_name: string;
  }>(
    `SELECT c.id, c.customer_id, c.provider_id, c.request_id, r.description, cat.name AS category_name,
            cu.name AS customer_name, pu.name AS provider_name
       FROM conversations c
       JOIN service_requests r ON r.id = c.request_id
       JOIN service_categories cat ON cat.id = r.category_id
       JOIN users cu ON cu.id = c.customer_id
       JOIN users pu ON pu.id = c.provider_id
      WHERE c.id = $1`,
    [id],
  );
  // Only the two participants can read a conversation. Admins do not browse chats; moderation uses complaints.
  if (!conversation || (conversation.customer_id !== user.id && conversation.provider_id !== user.id)) notFound();

  await query(
    `UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
    [id, user.id],
  );

  const messages = await query<{ id: string; sender_id: string; body: string; created_at: Date }>(
    `SELECT id, sender_id, body, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [id],
  );

  const isCustomer = conversation.customer_id === user.id;
  const otherName = isCustomer ? conversation.provider_name : conversation.customer_name;
  const requestHref = isCustomer ? `/customer/requests/${conversation.request_id}` : `/provider/requests/${conversation.request_id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header with counterpart info & link to request */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={otherName} size="md" verified={!isCustomer} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">{otherName}</h1>
                <span className="text-xs font-semibold text-slate-500">
                  ({isCustomer ? 'Provider' : 'Customer'})
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <CategoryIcon name={conversation.category_name} variant="plain" className="h-3.5 w-3.5" />
                <span>{conversation.category_name}</span>
                <span>·</span>
                <span className="truncate max-w-56">{conversation.description}</span>
              </p>
            </div>
          </div>

          <Link
            href={requestHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition"
          >
            <span>View request details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>

      <Flash ok={flash.ok} error={flash.error} />

      {/* Messages Stream Card */}
      <Card className="flex flex-col p-4 sm:p-6">
        <div className="mb-4 max-h-[60vh] min-h-72 space-y-3.5 overflow-y-auto px-1 py-2" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No messages in this conversation yet</p>
              <p className="text-xs text-slate-400 mt-1">Send a message below to discuss questions or quotation details.</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine ? <Avatar name={otherName} size="sm" className="mb-1" /> : null}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                      mine
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{m.body}</p>
                    <p className={`mt-1.5 text-[11px] font-medium ${mine ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                      {formatDateTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Box */}
        <form action={sendMessageAction} className="border-t border-slate-100 pt-4 space-y-3">
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <div>
            <textarea
              id="body"
              name="body"
              rows={3}
              required
              maxLength={2000}
              placeholder="Write your message here..."
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Info className="h-3.5 w-3.5" />
              Do not share bank or sensitive payment details in chat.
            </span>
            <SubmitButton pendingLabel="Sending…" className="gap-1.5 font-bold">
              <Send className="h-4 w-4" />
              <span>Send message</span>
            </SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
