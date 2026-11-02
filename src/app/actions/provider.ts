'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { files, flashRedirect, num, str } from '@/lib/forms';
import { UserError, handleActionErrors, isUuid } from '@/lib/errors';
import { notify, notifyAdmins } from '@/lib/notify';
import { saveUpload, type StoredFile } from '@/lib/storage';
import { COMMISSION_RATE, QUOTE_EXPIRY_DAYS } from '@/lib/constants';
import {
  BOOKING_STATUS_LIST,
  calculateCommission,
  canTransitionBooking,
  isValidTimeWindow,
  normalizeSkills,
  quotationExpiresAt,
  validateQuoteAmounts,
  type BookingStatus,
  type RequestStatus,
} from '@/lib/rules';

const MAX_WORK_PHOTOS = 6;
const DOCUMENT_TYPES = ['identity', 'certificate', 'licence', 'insurance', 'other'];
const BOOKING_STEP_MESSAGES: Partial<Record<BookingStatus, { title: string; body: string }>> = {
  provider_on_the_way: { title: 'Your provider is on the way', body: 'Please make sure the address is accessible.' },
  work_in_progress: { title: 'Work has started', body: 'Your provider has started the job.' },
  completed: { title: 'Job marked as completed', body: 'Please leave a review for your provider.' },
};

export async function updateProviderProfileAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const target = '/provider/profile';

  await handleActionErrors(target, async () => {
    const name = str(formData, 'name');
    const bio = str(formData, 'bio');
    const phone = str(formData, 'phone');
    const area = str(formData, 'service_area');
    const street = str(formData, 'street_address');
    const latitude = num(formData, 'latitude');
    const longitude = num(formData, 'longitude');
    const skills = normalizeSkills(str(formData, 'skills'));

    if (!name || name.length > 120) throw new UserError('Enter your business or display name (up to 120 characters).');
    if (bio.length > 1000) throw new UserError('Bio must be 1000 characters or fewer.');
    if (area.length > 120) throw new UserError('Service area must be 120 characters or fewer.');
    if (street.length > 200) throw new UserError('Street address must be 200 characters or fewer.');
    if ((latitude === null) !== (longitude === null)) {
      throw new UserError('Provide both latitude and longitude from the map pin, or leave both empty.');
    }
    if (latitude !== null && (latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180)) {
      throw new UserError('The map location is out of range.');
    }

    await withTransaction(async (tx) => {
      await tx.query(`UPDATE users SET name = $2, updated_at = now() WHERE id = $1`, [user.id, name]);
      await tx.query(
        `UPDATE provider_profiles
            SET bio = $2, skills = $3, phone = $4, service_area = $5, street_address = $6,
                latitude = $7, longitude = $8, updated_at = now()
          WHERE user_id = $1`,
        [user.id, bio || null, skills, phone || null, area || null, street || null, latitude, longitude],
      );
    });
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Profile saved.');
  });
}

export async function saveServiceAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const target = '/provider/profile';

  await handleActionErrors(target, async () => {
    const categoryId = str(formData, 'category_id');
    const price = num(formData, 'base_price');
    const description = str(formData, 'description');
    const isActive = formData.get('is_active') === 'on';

    if (!isUuid(categoryId)) throw new UserError('Choose a service category.');
    if (price === null || price < 0 || price > 99999999) throw new UserError('Enter a base price of zero or more.');
    if (description.length > 500) throw new UserError('Service description must be 500 characters or fewer.');

    await query(
      `INSERT INTO provider_services (provider_id, category_id, description, base_price, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (provider_id, category_id)
       DO UPDATE SET description = EXCLUDED.description, base_price = EXCLUDED.base_price,
                     is_active = EXCLUDED.is_active, updated_at = now()`,
      [user.id, categoryId, description || null, price, isActive],
    );
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Service and pricing saved.');
  });
}

export async function addAvailabilityAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const target = '/provider/profile';

  await handleActionErrors(target, async () => {
    const kind = str(formData, 'kind');
    if (kind === 'weekly') {
      const weekday = num(formData, 'weekday');
      const start = str(formData, 'start_time');
      const end = str(formData, 'end_time');
      if (weekday === null || weekday < 0 || weekday > 6) throw new UserError('Choose a day of the week.');
      if (!isValidTimeWindow(start, end)) throw new UserError('Choose a start and end time, with the end after the start.');
      await query(
        `INSERT INTO provider_availability (provider_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)`,
        [user.id, weekday, start, end],
      );
    } else if (kind === 'unavailable') {
      const date = str(formData, 'unavailable_date');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError('Choose a valid date.');
      await query(`INSERT INTO provider_availability (provider_id, unavailable_date) VALUES ($1, $2)`, [user.id, date]);
    } else {
      throw new UserError('Choose whether this is a weekly working period or an unavailable date.');
    }
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Availability updated.');
  });
}

export async function deleteAvailabilityAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const id = str(formData, 'availability_id');
  const target = '/provider/profile';
  await handleActionErrors(target, async () => {
    if (!isUuid(id)) throw new UserError('That entry could not be found.');
    await query(`DELETE FROM provider_availability WHERE id = $1 AND provider_id = $2`, [id, user.id]);
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Entry removed.');
  });
}

/**
 * Submits or revises a quotation. Only verified providers who offer the request's
 * category can quote, and only while the request is still open.
 */
export async function submitQuotationAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const requestId = str(formData, 'request_id');
  const target = `/provider/requests/${requestId}`;

  await handleActionErrors(target, async () => {
    if (!isUuid(requestId)) throw new UserError('That request could not be found.');

    const total = num(formData, 'total_estimate');
    const labour = num(formData, 'labour_cost');
    const materials = num(formData, 'material_cost');
    const duration = str(formData, 'estimated_duration');
    const warranty = str(formData, 'warranty_text');
    const notes = str(formData, 'notes');

    const amountProblem = validateQuoteAmounts({
      total: total ?? Number.NaN,
      labour: labour ?? Number.NaN,
      materials: materials ?? Number.NaN,
    });
    if (amountProblem) throw new UserError(amountProblem);
    if (!duration || duration.length > 80) throw new UserError('Enter the estimated completion time (up to 80 characters).');
    if (warranty.length > 300) throw new UserError('Warranty text must be 300 characters or fewer.');
    if (notes.length > 1000) throw new UserError('Notes must be 1000 characters or fewer.');

    const profile = await query<{ verification_status: string }>(
      `SELECT verification_status FROM provider_profiles WHERE user_id = $1`,
      [user.id],
    );
    if (profile[0]?.verification_status !== 'approved') {
      throw new UserError('Your account must be verified by ProSolution before you can send quotations.');
    }

    const expiresAt = quotationExpiresAt(new Date(), QUOTE_EXPIRY_DAYS);

    const customerId = await withTransaction(async (tx) => {
      // Lock the request so it cannot be accepted while this quotation is being written.
      const requestRows = await tx.query<{ status: RequestStatus; offers: boolean; customer_id: string }>(
        `SELECT r.status, r.customer_id,
                EXISTS (SELECT 1 FROM provider_services s
                         WHERE s.provider_id = $2 AND s.category_id = r.category_id AND s.is_active) AS offers
           FROM service_requests r WHERE r.id = $1 FOR UPDATE`,
        [requestId, user.id],
      );
      const request = requestRows.rows[0];
      if (!request) throw new UserError('That request could not be found.');
      if (request.customer_id === user.id) throw new UserError('You cannot quote on your own request.');
      if (request.status !== 'submitted' && request.status !== 'quotations_received') {
        throw new UserError('This request is no longer accepting quotations.');
      }
      if (!request.offers) throw new UserError('You do not offer this service category.');

      const upserted = await tx.query<{ id: string }>(
        `INSERT INTO quotations
           (request_id, provider_id, total_estimate, labour_cost, material_cost, estimated_duration, warranty_text, notes, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (request_id, provider_id) DO UPDATE SET
           total_estimate = EXCLUDED.total_estimate, labour_cost = EXCLUDED.labour_cost,
           material_cost = EXCLUDED.material_cost, estimated_duration = EXCLUDED.estimated_duration,
           warranty_text = EXCLUDED.warranty_text, notes = EXCLUDED.notes,
           expires_at = EXCLUDED.expires_at, updated_at = now()
         WHERE quotations.status = 'active'
         RETURNING id`,
        [requestId, user.id, total, labour, materials, duration, warranty || null, notes || null, expiresAt],
      );
      if (upserted.rows.length === 0) throw new UserError('This quotation was withdrawn and can no longer be changed.');

      await tx.query(
        `UPDATE service_requests SET status = 'quotations_received', updated_at = now()
          WHERE id = $1 AND status = 'submitted'`,
        [requestId],
      );
      return request.customer_id;
    });

    await notify(
      customerId,
      'new_quotation',
      'New quotation received',
      'Compare quotations side by side with FairQuote.',
      `/customer/requests/${requestId}`,
    );
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Quotation sent. The customer has been notified.');
  });
}

export async function withdrawQuotationAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const requestId = str(formData, 'request_id');
  const quotationId = str(formData, 'quotation_id');
  const target = `/provider/requests/${requestId}`;

  await handleActionErrors(target, async () => {
    if (!isUuid(quotationId) || !isUuid(requestId)) throw new UserError('That quotation could not be found.');
    await withTransaction(async (tx) => {
      const rows = await tx.query<{ status: string; request_status: RequestStatus }>(
        `SELECT q.status, r.status AS request_status
           FROM quotations q JOIN service_requests r ON r.id = q.request_id
          WHERE q.id = $1 AND q.provider_id = $2 FOR UPDATE OF q`,
        [quotationId, user.id],
      );
      const row = rows.rows[0];
      if (!row) throw new UserError('That quotation could not be found.');
      if (row.status !== 'active') throw new UserError('Only an active quotation can be withdrawn.');
      if (row.request_status !== 'submitted' && row.request_status !== 'quotations_received') {
        throw new UserError('This request has already moved on, so the quotation cannot be withdrawn.');
      }
      await tx.query(
        `UPDATE quotations SET status = 'withdrawn', withdrawn_at = now(), updated_at = now() WHERE id = $1`,
        [quotationId],
      );
    });
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Quotation withdrawn.');
  });
}

/**
 * Moves a booking through its lifecycle: on the way -> work in progress -> completed.
 * Completing a job records a simulated commission (FR-23). No payment is taken.
 */
export async function updateBookingStatusAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const bookingId = str(formData, 'booking_id');
  const next = str(formData, 'status') as BookingStatus;
  const target = `/provider/bookings/${bookingId}`;

  await handleActionErrors(target, async () => {
    if (!isUuid(bookingId)) throw new UserError('That booking could not be found.');
    if (!BOOKING_STATUS_LIST.includes(next) || next === 'cancelled' || next === 'quotation_accepted') {
      throw new UserError('Choose a valid next status. To cancel, use the cancel option.');
    }

    const customerId = await withTransaction(async (tx) => {
      const rows = await tx.query<{
        status: BookingStatus;
        provider_id: string;
        customer_id: string;
        request_id: string;
        total_estimate: string;
      }>(
        `SELECT b.status, b.provider_id, b.customer_id, b.request_id, q.total_estimate
           FROM bookings b JOIN quotations q ON q.id = b.quotation_id
          WHERE b.id = $1 FOR UPDATE OF b`,
        [bookingId],
      );
      const booking = rows.rows[0];
      if (!booking || booking.provider_id !== user.id) throw new UserError('That booking could not be found.');
      if (!canTransitionBooking(booking.status, next)) {
        throw new UserError(`A booking cannot move from "${booking.status.replaceAll('_', ' ')}" to "${next.replaceAll('_', ' ')}".`);
      }

      const completedAt = next === 'completed' ? new Date() : null;
      await tx.query(
        `UPDATE bookings SET status = $2, completed_at = COALESCE($3, completed_at), updated_at = now() WHERE id = $1`,
        [bookingId, next, completedAt],
      );
      await tx.query(`UPDATE service_requests SET status = $2, updated_at = now() WHERE id = $1`, [booking.request_id, next]);

      if (next === 'completed') {
        const total = Number(booking.total_estimate);
        await tx.query(
          `INSERT INTO commission_records (booking_id, rate, estimated_amount, status) VALUES ($1, $2, $3, 'simulated')`,
          [bookingId, COMMISSION_RATE, calculateCommission(total, COMMISSION_RATE)],
        );
      }
      return booking.customer_id;
    });

    const message = BOOKING_STEP_MESSAGES[next];
    if (message) await notify(customerId, 'booking_status', message.title, message.body, `/customer/requests`);
    revalidatePath(target);
    revalidatePath('/provider/bookings');
    flashRedirect(target, 'ok', `Status updated to "${next.replaceAll('_', ' ')}".`);
  });
}

export async function uploadDocumentAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const target = '/provider/documents';

  await handleActionErrors(target, async () => {
    const documentType = str(formData, 'document_type');
    const [file] = files(formData, 'document');
    if (!DOCUMENT_TYPES.includes(documentType)) throw new UserError('Choose the type of document.');
    if (!file) throw new UserError('Choose a file to upload.');

    const stored = await saveUpload(file, 'document', `verification/${user.id}`).catch((error: Error) => {
      throw new UserError(error.message);
    });

    await withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO provider_documents (provider_id, storage_key, original_name, file_type, size_bytes, document_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, stored.storageKey, stored.originalName, stored.fileType, stored.sizeBytes, documentType],
      );
      // Uploading new evidence returns the application to "Pending" (Section 9),
      // unless it is already verified.
      await tx.query(
        `UPDATE provider_profiles SET verification_status = 'pending', updated_at = now()
          WHERE user_id = $1 AND verification_status <> 'approved'`,
        [user.id],
      );
    });

    await notifyAdmins('verification', 'New verification document uploaded', user.name, `/admin/verification/${user.id}`);
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Document uploaded. An administrator will review it.');
  });
}

export async function uploadWorkPhotoAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const target = '/provider/work-photos';

  await handleActionErrors(target, async () => {
    const caption = str(formData, 'caption');
    const bookingId = str(formData, 'booking_id');
    const photos = files(formData, 'photos');

    if (caption.length > 200) throw new UserError('Captions must be 200 characters or fewer.');
    if (photos.length === 0) throw new UserError('Choose at least one photo.');
    if (photos.length > MAX_WORK_PHOTOS) throw new UserError(`Upload up to ${MAX_WORK_PHOTOS} photos at a time.`);

    if (bookingId) {
      // A photo can only be linked to a completed job that belongs to this provider (FR-06).
      if (!isUuid(bookingId)) throw new UserError('That job could not be found.');
      const rows = await query(
        `SELECT 1 FROM bookings WHERE id = $1 AND provider_id = $2 AND status = 'completed'`,
        [bookingId, user.id],
      );
      if (rows.length === 0) throw new UserError('Photos can only be linked to your own completed jobs.');
    }

    const stored: StoredFile[] = [];
    for (const photo of photos) {
      stored.push(await saveUpload(photo, 'photo', `workproof/${user.id}`).catch((error: Error) => {
        throw new UserError(error.message);
      }));
    }

    await withTransaction(async (tx) => {
      for (const file of stored) {
        await tx.query(
          `INSERT INTO work_photos (provider_id, booking_id, storage_key, original_name, file_type, size_bytes, caption)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [user.id, bookingId || null, file.storageKey, file.originalName, file.fileType, file.sizeBytes, caption || null],
        );
      }
    });

    revalidatePath(target);
    flashRedirect(target, 'ok', `${stored.length} photo${stored.length === 1 ? '' : 's'} added to your WorkProof.`);
  });
}

/** Providers can flag a review they believe is inappropriate. An admin then decides (FR-17). */
export async function reportReviewAction(formData: FormData): Promise<void> {
  const user = await requireRole('provider');
  const reviewId = str(formData, 'review_id');
  const target = '/provider/profile';

  await handleActionErrors(target, async () => {
    if (!isUuid(reviewId)) throw new UserError('That review could not be found.');
    const rows = await query(
      `UPDATE reviews SET moderation_status = 'flagged'
        WHERE id = $1 AND provider_id = $2 AND moderation_status = 'published' RETURNING id`,
      [reviewId, user.id],
    );
    if (rows.length === 0) throw new UserError('That review could not be reported.');
    await notifyAdmins('review_flagged', 'A review was reported', 'A provider flagged a review for moderation.', '/admin/reviews');
    revalidatePath(target);
    flashRedirect(target, 'ok', 'Thank you. The review has been sent to moderation.');
  });
}
