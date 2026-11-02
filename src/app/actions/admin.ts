'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { flashRedirect, num, str } from '@/lib/forms';
import { UserError, handleActionErrors, isUuid } from '@/lib/errors';
import { audit, notify } from '@/lib/notify';
import { isVerificationDecision, verificationNotesRequired, type VerificationDecision } from '@/lib/rules';

const DECISION_MESSAGES: Record<VerificationDecision, { title: string; body: string }> = {
  approved: {
    title: 'Your ProSolution verification is approved',
    body: 'Your profile now shows the Verified badge. This means ProSolution reviewed your documents, not a guarantee of skill.',
  },
  rejected: {
    title: 'Your verification was not approved',
    body: 'Open Verification to read the reviewer notes.',
  },
  needs_more_info: {
    title: 'More information needed for verification',
    body: 'Open Verification to read what is needed, then upload the documents.',
  },
};

/**
 * Approve, reject or request more information for a provider application (FR-05).
 * Records the reviewer, timestamp and notes on the documents and in the audit log.
 */
export async function decideVerificationAction(formData: FormData): Promise<void> {
  const admin = await requireRole('admin');
  const providerId = str(formData, 'provider_id');
  const decision = str(formData, 'decision');
  const notes = str(formData, 'notes');
  const target = `/admin/verification/${providerId}`;

  await handleActionErrors(target, async () => {
    if (!isUuid(providerId)) throw new UserError('That provider could not be found.');
    if (!isVerificationDecision(decision)) throw new UserError('Choose a decision.');
    if (notes.length > 1000) throw new UserError('Notes must be 1000 characters or fewer.');
    if (verificationNotesRequired(decision) && notes.length < 5) {
      throw new UserError('Explain the decision in the notes (at least 5 characters) so the provider knows what to fix.');
    }

    await withTransaction(async (tx) => {
      const profile = await tx.query(
        `SELECT user_id FROM provider_profiles WHERE user_id = $1 FOR UPDATE`,
        [providerId],
      );
      if (profile.rows.length === 0) throw new UserError('That provider could not be found.');

      if (decision === 'approved') {
        const usable = await tx.query<{ n: string }>(
          `SELECT count(*) AS n FROM provider_documents WHERE provider_id = $1 AND review_status <> 'rejected'`,
          [providerId],
        );
        if (Number(usable.rows[0].n) === 0) {
          throw new UserError('Upload and review at least one document before approving this provider.');
        }
      }

      await tx.query(
        `UPDATE provider_documents
            SET review_status = $2, reviewed_by = $3, review_notes = $4, reviewed_at = now()
          WHERE provider_id = $1 AND review_status IN ('pending', 'needs_more_info')`,
        [providerId, decision, admin.id, notes || null],
      );
      await tx.query(
        `UPDATE provider_profiles
            SET verification_status = $2, verification_decided_at = now(),
                verification_reviewed_by = $3, updated_at = now()
          WHERE user_id = $1`,
        [providerId, decision, admin.id],
      );
    });

    await audit(admin.id, `verification.${decision}`, 'provider', providerId, { notes });
    const message = DECISION_MESSAGES[decision];
    const extra = notes ? ` Reviewer notes: ${notes}` : '';
    await notify(providerId, 'verification', message.title, (message.body + extra).slice(0, 500), '/provider/documents');

    revalidatePath('/admin/verification');
    revalidatePath(target);
    flashRedirect(target, 'ok', `Decision recorded: ${decision.replaceAll('_', ' ')}.`);
  });
}

export async function setAccountStatusAction(formData: FormData): Promise<void> {
  const admin = await requireRole('admin');
  const userId = str(formData, 'user_id');
  const status = str(formData, 'status');
  const target = '/admin/accounts';

  await handleActionErrors(target, async () => {
    if (!isUuid(userId)) throw new UserError('That account could not be found.');
    if (status !== 'active' && status !== 'suspended') throw new UserError('Choose a valid account status.');
    if (userId === admin.id) throw new UserError('You cannot change the status of your own account.');

    const rows = await query<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (!rows[0]) throw new UserError('That account could not be found.');
    if (rows[0].role === 'admin') throw new UserError('Administrator accounts cannot be suspended here.');

    await query(`UPDATE users SET account_status = $2, updated_at = now() WHERE id = $1`, [userId, status]);
    await audit(admin.id, status === 'suspended' ? 'account.suspended' : 'account.reactivated', 'user', userId);
    revalidatePath(target);
    flashRedirect(target, 'ok', status === 'suspended' ? 'Account suspended.' : 'Account reactivated.');
  });
}

export async function moderateReviewAction(formData: FormData): Promise<void> {
  const admin = await requireRole('admin');
  const reviewId = str(formData, 'review_id');
  const status = str(formData, 'status');
  const target = '/admin/reviews';

  await handleActionErrors(target, async () => {
    if (!isUuid(reviewId)) throw new UserError('That review could not be found.');
    if (status !== 'published' && status !== 'hidden') throw new UserError('Choose publish or hide.');

    const rows = await query<{ id: string }>(
      `UPDATE reviews SET moderation_status = $2, moderated_by = $3, moderated_at = now() WHERE id = $1 RETURNING id`,
      [reviewId, status, admin.id],
    );
    if (rows.length === 0) throw new UserError('That review could not be found.');

    await audit(admin.id, `review.${status}`, 'review', reviewId);
    revalidatePath(target);
    flashRedirect(target, 'ok', status === 'hidden' ? 'Review hidden from public view.' : 'Review published.');
  });
}

/** Moves a complaint through review and closes it with resolution notes (FR-18). */
export async function resolveComplaintAction(formData: FormData): Promise<void> {
  const admin = await requireRole('admin');
  const complaintId = str(formData, 'complaint_id');
  const status = str(formData, 'status');
  const notes = str(formData, 'resolution_notes');
  const target = '/admin/complaints';

  await handleActionErrors(target, async () => {
    if (!isUuid(complaintId)) throw new UserError('That complaint could not be found.');
    if (!['under_review', 'resolved', 'closed'].includes(status)) throw new UserError('Choose a valid status.');
    if (notes.length > 2000) throw new UserError('Resolution notes must be 2000 characters or fewer.');
    if ((status === 'resolved' || status === 'closed') && notes.length < 5) {
      throw new UserError('Record resolution notes (at least 5 characters) before resolving or closing a complaint.');
    }

    const closing = status === 'resolved' || status === 'closed';
    const rows = await query<{ raised_by: string }>(
      `UPDATE complaints
          SET status = $2,
              resolution_notes = COALESCE(NULLIF($3, ''), resolution_notes),
              resolved_by = CASE WHEN $4 THEN $5::uuid ELSE resolved_by END,
              resolved_at = CASE WHEN $4 THEN now() ELSE resolved_at END,
              updated_at = now()
        WHERE id = $1
        RETURNING raised_by`,
      [complaintId, status, notes, closing, admin.id],
    );
    if (rows.length === 0) throw new UserError('That complaint could not be found.');

    await audit(admin.id, `complaint.${status}`, 'complaint', complaintId, { notes });
    await notify(rows[0].raised_by, 'complaint', 'Update on your complaint', `Status: ${status.replaceAll('_', ' ')}`, '/complaints');
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Complaint updated.');
  });
}

/** Simulated paid promotion record (Section 16). No payment is collected. */
export async function createPromotionAction(formData: FormData): Promise<void> {
  const admin = await requireRole('admin');
  const providerId = str(formData, 'provider_id');
  const campaign = str(formData, 'campaign_name');
  const startRaw = str(formData, 'start_at');
  const endRaw = str(formData, 'end_at');
  const fee = num(formData, 'simulated_fee');
  const target = '/admin/promotions';

  await handleActionErrors(target, async () => {
    if (!isUuid(providerId)) throw new UserError('Choose a verified provider.');
    if (!campaign || campaign.length > 120) throw new UserError('Enter a campaign name (up to 120 characters).');
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new UserError('Enter a start and an end date, with the end after the start.');
    }
    if (fee === null || fee < 0) throw new UserError('Enter a simulated fee of zero or more.');

    const provider = await query(
      `SELECT 1 FROM provider_profiles WHERE user_id = $1 AND verification_status = 'approved'`,
      [providerId],
    );
    if (provider.length === 0) throw new UserError('Promotions can only be created for verified providers.');

    const inserted = await query<{ id: string }>(
      `INSERT INTO promotions (provider_id, campaign_name, start_at, end_at, simulated_fee)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [providerId, campaign, start, end, fee],
    );
    await audit(admin.id, 'promotion.created', 'promotion', inserted[0].id, { simulated_fee: fee });
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Simulated promotion recorded. Promoted listings must be labelled as promoted.');
  });
}

export async function endPromotionAction(formData: FormData): Promise<void> {
  const admin = await requireRole('admin');
  const promotionId = str(formData, 'promotion_id');
  const target = '/admin/promotions';
  await handleActionErrors(target, async () => {
    if (!isUuid(promotionId)) throw new UserError('That promotion could not be found.');
    await query(`UPDATE promotions SET status = 'ended' WHERE id = $1`, [promotionId]);
    await audit(admin.id, 'promotion.ended', 'promotion', promotionId);
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Promotion ended.');
  });
}
