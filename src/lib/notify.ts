import 'server-only';
import { query } from './db';

/**
 * In-website notifications (FR-19). Called after the related database change has
 * committed, so a notification never announces something that did not happen.
 */
export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string | null = null,
  targetUrl: string | null = null,
): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, target_url) VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, body, targetUrl],
  );
}

export async function notifyAdmins(type: string, title: string, body: string | null, targetUrl: string | null): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, target_url)
     SELECT id, $1, $2, $3, $4 FROM users WHERE role = 'admin' AND account_status = 'active'`,
    [type, title, body, targetUrl],
  );
}

/**
 * Audit trail for sensitive actions (verification decisions, suspensions,
 * moderation, dispute resolution, status changes). Section 15 / FR-20.
 */
export async function audit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, metadata_json)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, targetType, targetId, JSON.stringify(metadata)],
  );
}
