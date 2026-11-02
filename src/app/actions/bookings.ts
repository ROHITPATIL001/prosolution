'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { flashRedirect, str } from '@/lib/forms';
import { UserError, handleActionErrors, isUuid } from '@/lib/errors';
import { notify } from '@/lib/notify';
import { canCancelBooking, type RequestStatus } from '@/lib/rules';

/**
 * Cancels a booking. Either the customer or the provider may cancel, but only
 * before work starts (FR-16). The reason and the canceller are recorded.
 */
export async function cancelBookingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const bookingId = str(formData, 'booking_id');
  const reason = str(formData, 'reason');

  let target = user.role === 'provider' ? '/provider/bookings' : '/customer/requests';
  await handleActionErrors(target, async () => {
    if (!isUuid(bookingId)) throw new UserError('That booking could not be found.');
    if (reason.length > 500) throw new UserError('The reason must be 500 characters or fewer.');
    if (!reason) throw new UserError('Give a short reason for cancelling so the other party understands.');

    const otherPartyId = await withTransaction(async (tx) => {
      const rows = await tx.query<{
        status: RequestStatus;
        customer_id: string;
        provider_id: string;
        request_id: string;
      }>(
        `SELECT status, customer_id, provider_id, request_id FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId],
      );
      const booking = rows.rows[0];
      const isParticipant = booking && (booking.customer_id === user.id || booking.provider_id === user.id);
      if (!booking || !isParticipant) throw new UserError('That booking could not be found.');
      if (!canCancelBooking(booking.status)) {
        throw new UserError('This booking can no longer be cancelled because work has started or finished.');
      }

      await tx.query(
        `UPDATE bookings
            SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2, cancellation_reason = $3, updated_at = now()
          WHERE id = $1`,
        [bookingId, user.id, reason],
      );
      await tx.query(
        `UPDATE service_requests
            SET status = 'cancelled', cancelled_by = $2, cancelled_at = now(), cancellation_reason = $3, updated_at = now()
          WHERE id = $1`,
        [booking.request_id, user.id, reason],
      );

      target = user.role === 'provider' ? `/provider/bookings/${bookingId}` : `/customer/requests/${booking.request_id}`;
      return booking.customer_id === user.id ? booking.provider_id : booking.customer_id;
    });

    await notify(otherPartyId, 'booking_cancelled', 'A booking was cancelled', reason, target);
    revalidatePath('/customer/requests');
    revalidatePath('/provider/bookings');
    flashRedirect(target, 'ok', 'Booking cancelled. The other party has been notified.');
  });
}
