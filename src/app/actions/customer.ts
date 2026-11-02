'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { files, flashRedirect, num, str } from '@/lib/forms';
import { UserError, handleActionErrors, isUuid } from '@/lib/errors';
import { notify } from '@/lib/notify';
import { saveUpload, type StoredFile } from '@/lib/storage';
import {
  canCancelRequest,
  checkQuotationAcceptance,
  checkReviewEligibility,
  validateRating,
  type RequestStatus,
} from '@/lib/rules';

const MAX_REQUEST_PHOTOS = 3;

export async function updateCustomerProfileAction(formData: FormData): Promise<void> {
  const user = await requireRole('customer');
  const target = '/customer/profile';
  await handleActionErrors(target, async () => {
    const name = str(formData, 'name');
    const phone = str(formData, 'phone');
    const preferences = str(formData, 'address_preferences');
    if (!name || name.length > 120) throw new UserError('Enter your name (up to 120 characters).');
    if (phone.length > 30) throw new UserError('Phone number is too long.');
    if (preferences.length > 300) throw new UserError('Address preferences must be 300 characters or fewer.');

    await withTransaction(async (tx) => {
      await tx.query(`UPDATE users SET name = $2, updated_at = now() WHERE id = $1`, [user.id, name]);
      await tx.query(
        `INSERT INTO customer_profiles (user_id, phone, address_preferences) VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone,
           address_preferences = EXCLUDED.address_preferences, updated_at = now()`,
        [user.id, phone || null, preferences || null],
      );
    });
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Profile saved.');
  });
}

export async function createRequestAction(formData: FormData): Promise<void> {
  const user = await requireRole('customer');
  const target = '/customer/requests/new';

  await handleActionErrors(target, async () => {
    const categoryId = str(formData, 'category_id');
    const description = str(formData, 'description');
    const area = str(formData, 'area');
    const address = str(formData, 'address');
    const latitude = num(formData, 'latitude');
    const longitude = num(formData, 'longitude');
    const preferredRaw = str(formData, 'preferred_at');
    const photos = files(formData, 'photos');

    if (!isUuid(categoryId)) throw new UserError('Choose a service category.');
    if (description.length < 10 || description.length > 2000) {
      throw new UserError('Describe the job in 10 to 2000 characters.');
    }
    if (!area || area.length > 120) throw new UserError('Enter your area or neighbourhood (up to 120 characters).');
    if (!address || address.length > 200) throw new UserError('Enter the street address (up to 200 characters).');
    if ((latitude === null) !== (longitude === null)) {
      throw new UserError('Provide both latitude and longitude, or leave both empty.');
    }
    if (latitude !== null && (latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180)) {
      throw new UserError('The map location is out of range.');
    }

    let preferredAt: Date | null = null;
    if (preferredRaw) {
      preferredAt = new Date(preferredRaw);
      if (Number.isNaN(preferredAt.getTime()) || preferredAt.getTime() < Date.now()) {
        throw new UserError('Choose a preferred date and time in the future.');
      }
    }
    if (photos.length > MAX_REQUEST_PHOTOS) throw new UserError(`Attach up to ${MAX_REQUEST_PHOTOS} photos.`);

    const category = await query(`SELECT id FROM service_categories WHERE id = $1 AND is_active`, [categoryId]);
    if (category.length === 0) throw new UserError('That service category is not available.');

    // Validate and store photos before writing the request. A bad file stops the whole submission.
    const stored: StoredFile[] = [];
    for (const photo of photos) {
      try {
        stored.push(await saveUpload(photo, 'photo', 'requests'));
      } catch (error) {
        throw new UserError(error instanceof Error ? error.message : 'A photo could not be uploaded.');
      }
    }

    const requestId = await withTransaction(async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO service_requests
           (customer_id, category_id, description, area, address, latitude, longitude, preferred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [user.id, categoryId, description, area, address, latitude, longitude, preferredAt],
      );
      const id = inserted.rows[0].id;
      for (const file of stored) {
        await tx.query(
          `INSERT INTO request_attachments (request_id, storage_key, original_name, file_type, size_bytes, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, file.storageKey, file.originalName, file.fileType, file.sizeBytes, user.id],
        );
      }
      return id;
    });

    // Tell approved providers who offer this category that a request is open.
    const providers = await query<{ user_id: string }>(
      `SELECT p.user_id FROM provider_profiles p
         JOIN users u ON u.id = p.user_id AND u.account_status = 'active'
        WHERE p.verification_status = 'approved'
          AND EXISTS (SELECT 1 FROM provider_services s
                       WHERE s.provider_id = p.user_id AND s.category_id = $1 AND s.is_active)`,
      [categoryId],
    );
    for (const provider of providers) {
      await notify(provider.user_id, 'new_request', 'New request in your area of work', area, `/provider/requests/${requestId}`);
    }

    revalidatePath('/customer/requests');
    flashRedirect(`/customer/requests/${requestId}`, 'ok', 'Request submitted. Providers will send quotations soon.');
  });
}

export async function cancelRequestAction(formData: FormData): Promise<void> {
  const user = await requireRole('customer');
  const requestId = str(formData, 'request_id');
  const reason = str(formData, 'reason');
  const target = `/customer/requests/${requestId}`;

  await handleActionErrors(target, async () => {
    if (!isUuid(requestId)) throw new UserError('That request could not be found.');
    if (reason.length > 500) throw new UserError('The reason must be 500 characters or fewer.');

    const rows = await query<{ status: RequestStatus; customer_id: string }>(
      `SELECT status, customer_id FROM service_requests WHERE id = $1`,
      [requestId],
    );
    const request = rows[0];
    if (!request || request.customer_id !== user.id) throw new UserError('That request could not be found.');
    if (!canCancelRequest(request.status)) {
      throw new UserError('This request can no longer be cancelled here. Use the booking cancellation option instead.');
    }

    const providers = await query<{ provider_id: string }>(
      `SELECT provider_id FROM quotations WHERE request_id = $1 AND status = 'active'`,
      [requestId],
    );

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE service_requests
            SET status = 'cancelled', cancellation_reason = $2, cancelled_by = $3, cancelled_at = now(), updated_at = now()
          WHERE id = $1`,
        [requestId, reason || null, user.id],
      );
      await tx.query(
        `UPDATE quotations SET status = 'withdrawn', withdrawn_at = now(), updated_at = now()
          WHERE request_id = $1 AND status = 'active'`,
        [requestId],
      );
    });

    for (const provider of providers) {
      await notify(provider.provider_id, 'request_cancelled', 'A customer cancelled their request', null, '/provider/requests');
    }
    revalidatePath('/customer/requests');
    flashRedirect(target, 'ok', 'Request cancelled.');
  });
}

/**
 * Accepts exactly one quotation. The request row is locked, the quotation is
 * checked for expiry and status, and every other quotation is closed in the same
 * transaction. A UNIQUE constraint on bookings.request_id is the final safeguard
 * against duplicate acceptance (FR-13, Section 21).
 */
export async function acceptQuotationAction(formData: FormData): Promise<void> {
  const user = await requireRole('customer');
  const requestId = str(formData, 'request_id');
  const quotationId = str(formData, 'quotation_id');
  const target = `/customer/requests/${requestId}`;

  let providerId = '';
  await handleActionErrors(target, async () => {
    if (!isUuid(requestId) || !isUuid(quotationId)) throw new UserError('That quotation could not be found.');

    const bookingId = await withTransaction(async (tx) => {
      const requestRows = await tx.query<{ status: RequestStatus; customer_id: string }>(
        `SELECT status, customer_id FROM service_requests WHERE id = $1 FOR UPDATE`,
        [requestId],
      );
      const request = requestRows.rows[0];
      if (!request || request.customer_id !== user.id) throw new UserError('That request could not be found.');

      const quoteRows = await tx.query<{ id: string; provider_id: string; status: 'active' | 'withdrawn' | 'accepted' | 'not_selected'; expires_at: Date }>(
        `SELECT id, provider_id, status, expires_at FROM quotations
          WHERE id = $1 AND request_id = $2 FOR UPDATE`,
        [quotationId, requestId],
      );
      const quote = quoteRows.rows[0];

      const check = checkQuotationAcceptance({
        requestStatus: request.status,
        quotation: quote ? { status: quote.status, expiresAt: new Date(quote.expires_at) } : null,
      });
      if (!check.ok) throw new UserError(check.reason);

      providerId = quote.provider_id;
      await tx.query(`UPDATE quotations SET status = 'accepted', updated_at = now() WHERE id = $1`, [quotationId]);
      await tx.query(
        `UPDATE quotations SET status = 'not_selected', updated_at = now()
          WHERE request_id = $1 AND id <> $2 AND status = 'active'`,
        [requestId, quotationId],
      );
      await tx.query(
        `UPDATE service_requests SET status = 'quotation_accepted', updated_at = now() WHERE id = $1`,
        [requestId],
      );
      const booking = await tx.query<{ id: string }>(
        `INSERT INTO bookings (request_id, quotation_id, customer_id, provider_id, status)
         VALUES ($1, $2, $3, $4, 'quotation_accepted') RETURNING id`,
        [requestId, quotationId, user.id, quote.provider_id],
      );
      return booking.rows[0].id;
    });

    await notify(providerId, 'quotation_accepted', 'Your quotation was accepted', 'Open the booking to see the address and next steps.', `/provider/bookings/${bookingId}`);
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Quotation accepted. Your booking is confirmed and the provider has been notified.');
  });
}

export async function submitReviewAction(formData: FormData): Promise<void> {
  const user = await requireRole('customer');
  const bookingId = str(formData, 'booking_id');
  const requestId = str(formData, 'request_id');
  const target = `/customer/requests/${requestId}`;

  await handleActionErrors(target, async () => {
    if (!isUuid(bookingId)) throw new UserError('That booking could not be found.');
    const rating = num(formData, 'rating') ?? 0;
    const text = str(formData, 'review_text');

    const problem = validateRating(rating, text);
    if (problem) throw new UserError(problem);

    const rows = await query<{ status: RequestStatus; customer_id: string; provider_id: string; reviewed: boolean }>(
      `SELECT b.status, b.customer_id, b.provider_id, EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id) AS reviewed
         FROM bookings b WHERE b.id = $1`,
      [bookingId],
    );
    const booking = rows[0];
    if (!booking) throw new UserError('That booking could not be found.');

    const eligibility = checkReviewEligibility({
      bookingStatus: booking.status,
      bookingCustomerId: booking.customer_id,
      userId: user.id,
      alreadyReviewed: booking.reviewed,
    });
    if (!eligibility.ok) throw new UserError(eligibility.reason);

    await query(
      `INSERT INTO reviews (booking_id, customer_id, provider_id, rating, review_text) VALUES ($1, $2, $3, $4, $5)`,
      [bookingId, user.id, booking.provider_id, rating, text || null],
    );
    await notify(booking.provider_id, 'review', 'You received a new review', `${rating} out of 5 stars`, '/provider/profile');
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Thank you. Your review has been published.');
  });
}
