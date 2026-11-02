'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { flashRedirect, str } from '@/lib/forms';
import { notify, notifyAdmins } from '@/lib/notify';

const COMPLAINT_CATEGORIES = ['payment', 'quality', 'behaviour', 'cancellation', 'other'];

/** Sends a message. Only the two participants of a conversation may post in it. */
export async function sendMessageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const conversationId = str(formData, 'conversation_id');
  const body = str(formData, 'body');
  const target = `/messages/${conversationId}`;

  if (!body || body.length > 2000) flashRedirect(target, 'error', 'Messages must be between 1 and 2000 characters.');

  const rows = await query<{ customer_id: string; provider_id: string; request_id: string }>(
    `SELECT customer_id, provider_id, request_id FROM conversations WHERE id = $1`,
    [conversationId],
  );
  const conversation = rows[0];
  if (!conversation || (conversation.customer_id !== user.id && conversation.provider_id !== user.id)) {
    flashRedirect('/messages', 'error', 'That conversation could not be found.');
  }

  await query(`INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)`, [conversationId, user.id, body]);

  const recipient = conversation.customer_id === user.id ? conversation.provider_id : conversation.customer_id;
  await notify(recipient, 'message', `New message from ${user.name}`, body.slice(0, 120), target);

  revalidatePath(target);
  flashRedirect(target, 'ok', 'Message sent.');
}

/**
 * Opens (or reopens) a conversation about a request. Allowed only when the provider
 * has a quotation on that request, so customers and providers can message before
 * acceptance (FR-14) without anyone contacting strangers.
 */
export async function openConversationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const requestId = str(formData, 'request_id');
  const counterpartId = str(formData, 'counterpart_id');

  const requests = await query<{ customer_id: string }>(
    `SELECT customer_id FROM service_requests WHERE id = $1`,
    [requestId],
  );
  const request = requests[0];
  if (!request) flashRedirect('/messages', 'error', 'That request could not be found.');

  let customerId: string;
  let providerId: string;
  if (user.role === 'customer' && request.customer_id === user.id) {
    customerId = user.id;
    providerId = counterpartId;
  } else if (user.role === 'provider') {
    customerId = request.customer_id;
    providerId = user.id;
  } else {
    flashRedirect('/messages', 'error', 'You cannot message about this request.');
  }

  const quotes = await query(
    `SELECT 1 FROM quotations WHERE request_id = $1 AND provider_id = $2`,
    [requestId, providerId],
  );
  if (quotes.length === 0) flashRedirect('/messages', 'error', 'Messaging opens once a provider has submitted a quotation.');

  const rows = await query<{ id: string }>(
    `INSERT INTO conversations (customer_id, provider_id, request_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (customer_id, provider_id, request_id) DO UPDATE SET request_id = EXCLUDED.request_id
     RETURNING id`,
    [customerId, providerId, requestId],
  );
  redirect(`/messages/${rows[0].id}`);
}

/**
 * Files a complaint about a booking (or a general complaint with no booking).
 * Admins are notified and resolve it from the admin complaints screen (FR-18).
 */
export async function createComplaintAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const bookingId = str(formData, 'booking_id') || null;
  const category = str(formData, 'category');
  const description = str(formData, 'description');
  const target = '/complaints';

  if (!COMPLAINT_CATEGORIES.includes(category)) flashRedirect(target, 'error', 'Choose a complaint category.');
  if (description.length < 10 || description.length > 2000) {
    flashRedirect(target, 'error', 'Describe the problem in 10 to 2000 characters.');
  }

  let againstUserId: string | null = null;
  if (bookingId) {
    const rows = await query<{ customer_id: string; provider_id: string }>(
      `SELECT customer_id, provider_id FROM bookings WHERE id = $1`,
      [bookingId],
    );
    const booking = rows[0];
    if (!booking || (booking.customer_id !== user.id && booking.provider_id !== user.id)) {
      flashRedirect(target, 'error', 'You can only complain about your own bookings.');
    }
    againstUserId = booking.customer_id === user.id ? booking.provider_id : booking.customer_id;
  } else {
    flashRedirect(target, 'error', 'Select the booking this complaint is about.');
  }

  const inserted = await query<{ id: string }>(
    `INSERT INTO complaints (booking_id, raised_by, against_user_id, category, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [bookingId, user.id, againstUserId, category, description],
  );

  await notifyAdmins('complaint', 'New complaint filed', `Category: ${category}`, '/admin/complaints');
  await notify(againstUserId!, 'complaint', 'A complaint was filed about one of your bookings', null, '/complaints');

  revalidatePath(target);
  flashRedirect(target, 'ok', `Complaint ${inserted[0].id.slice(0, 8)} submitted. An administrator will review it.`);
}

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [user.id]);
  revalidatePath('/notifications');
  flashRedirect('/notifications', 'ok', 'All notifications marked as read.');
}
