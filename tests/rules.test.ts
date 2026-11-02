// Unit tests for the pure business rules.
// Run with:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCommission,
  canCancelBooking,
  canCancelRequest,
  canTransitionBooking,
  checkQuotationAcceptance,
  checkReviewEligibility,
  checkUpload,
  detectMime,
  distanceKm,
  isQuotationExpired,
  isValidEmail,
  isValidTimeWindow,
  normalizeSkills,
  parsePage,
  passwordProblem,
  quotationExpiresAt,
  validateQuoteAmounts,
  validateRating,
  verificationNotesRequired,
} from '../src/lib/rules.ts';

const DAY = 24 * 60 * 60 * 1000;

test('quotations expire after the configured number of days (FR-12)', () => {
  const created = new Date('2026-01-01T00:00:00Z');
  const expires = quotationExpiresAt(created, 7);
  assert.equal(expires.getTime() - created.getTime(), 7 * DAY);

  assert.equal(isQuotationExpired({ status: 'active', expiresAt: expires }, new Date(expires.getTime() - 1)), false);
  assert.equal(isQuotationExpired({ status: 'active', expiresAt: expires }, expires), true);
  // Withdrawn or accepted quotations are not reported as "expired".
  assert.equal(isQuotationExpired({ status: 'withdrawn', expiresAt: expires }, new Date(expires.getTime() + DAY)), false);
});

test('an expired quotation cannot be accepted (FR-12)', () => {
  const expiresAt = new Date('2026-01-08T00:00:00Z');
  const result = checkQuotationAcceptance({
    requestStatus: 'quotations_received',
    quotation: { status: 'active', expiresAt },
    now: new Date('2026-01-09T00:00:00Z'),
  });
  assert.equal(result.ok, false);
});

test('only one quotation can be accepted for a request (FR-13)', () => {
  const expiresAt = new Date('2099-01-01T00:00:00Z');
  const open = checkQuotationAcceptance({
    requestStatus: 'quotations_received',
    quotation: { status: 'active', expiresAt },
  });
  assert.equal(open.ok, true);

  const alreadyTaken = checkQuotationAcceptance({
    requestStatus: 'quotation_accepted',
    quotation: { status: 'not_selected', expiresAt },
  });
  assert.equal(alreadyTaken.ok, false);

  const sibling = checkQuotationAcceptance({
    requestStatus: 'quotations_received',
    quotation: { status: 'not_selected', expiresAt },
  });
  assert.equal(sibling.ok, false);
});

test('quotation amounts must be non-negative and cover labour + materials', () => {
  assert.equal(validateQuoteAmounts({ total: 200, labour: 120, materials: 60 }), null);
  assert.ok(validateQuoteAmounts({ total: 100, labour: 120, materials: 60 }));
  assert.ok(validateQuoteAmounts({ total: 0, labour: 0, materials: 0 }));
  assert.ok(validateQuoteAmounts({ total: 100, labour: -1, materials: 0 }));
  assert.ok(validateQuoteAmounts({ total: Number.NaN, labour: 0, materials: 0 }));
});

test('booking status transitions follow the defined lifecycle (FR-15)', () => {
  assert.equal(canTransitionBooking('quotation_accepted', 'provider_on_the_way'), true);
  assert.equal(canTransitionBooking('provider_on_the_way', 'work_in_progress'), true);
  assert.equal(canTransitionBooking('work_in_progress', 'completed'), true);

  // No skipping steps and no moving backwards.
  assert.equal(canTransitionBooking('quotation_accepted', 'completed'), false);
  assert.equal(canTransitionBooking('completed', 'work_in_progress'), false);
  assert.equal(canTransitionBooking('cancelled', 'quotation_accepted'), false);
});

test('cancellation is allowed only before work starts (FR-16)', () => {
  assert.equal(canCancelBooking('quotation_accepted'), true);
  assert.equal(canCancelBooking('provider_on_the_way'), true);
  assert.equal(canCancelBooking('work_in_progress'), false);
  assert.equal(canCancelBooking('completed'), false);

  assert.equal(canCancelRequest('submitted'), true);
  assert.equal(canCancelRequest('quotation_accepted'), false);
});

test('reviews require a completed booking owned by the reviewer (FR-06, FR-17)', () => {
  const base = { bookingCustomerId: 'c1', userId: 'c1', alreadyReviewed: false };
  assert.equal(checkReviewEligibility({ ...base, bookingStatus: 'completed' }).ok, true);
  assert.equal(checkReviewEligibility({ ...base, bookingStatus: 'work_in_progress' }).ok, false);
  assert.equal(checkReviewEligibility({ ...base, bookingStatus: 'completed', userId: 'someone-else' }).ok, false);
  assert.equal(checkReviewEligibility({ ...base, bookingStatus: 'completed', alreadyReviewed: true }).ok, false);
});

test('ratings are whole numbers from 1 to 5', () => {
  assert.equal(validateRating(4, 'Good work'), null);
  assert.ok(validateRating(0, ''));
  assert.ok(validateRating(6, ''));
  assert.ok(validateRating(3.5, ''));
});

test('rejecting or asking for more information requires notes', () => {
  assert.equal(verificationNotesRequired('approved'), false);
  assert.equal(verificationNotesRequired('rejected'), true);
  assert.equal(verificationNotesRequired('needs_more_info'), true);
});

test('commission is a rounded simulated estimate (FR-23)', () => {
  assert.equal(calculateCommission(199.99, 0.05), 10);
  assert.equal(calculateCommission(100, 0.1), 10);
});

test('distance between two known points is roughly correct', () => {
  // Central London to Paris is about 344 km.
  const km = distanceKm(51.5074, -0.1278, 48.8566, 2.3522);
  assert.ok(km > 340 && km < 350, `expected ~344 km, got ${km}`);
  assert.equal(distanceKm(10, 10, 10, 10), 0);
});

test('page numbers are parsed safely', () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage('3'), 3);
  assert.equal(parsePage('-4'), 1);
  assert.equal(parsePage('abc'), 1);
  assert.equal(parsePage('99999'), 1000);
});

test('skills are trimmed, de-duplicated and capped', () => {
  assert.deepEqual(normalizeSkills(' Wiring , wiring, Fuse   boxes ,, '), ['Wiring', 'Fuse boxes']);
  assert.equal(normalizeSkills(Array.from({ length: 30 }, (_, i) => `skill${i}`).join(',')).length, 15);
});

test('email and password rules', () => {
  assert.equal(isValidEmail('student@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.ok(passwordProblem('short1'));
  assert.ok(passwordProblem('nodigitshere'));
  assert.equal(passwordProblem('goodpass1'), null);
});

test('availability time windows must end after they start', () => {
  assert.equal(isValidTimeWindow('09:00', '17:30'), true);
  assert.equal(isValidTimeWindow('17:00', '09:00'), false);
  assert.equal(isValidTimeWindow('09:00', '09:00'), false);
  assert.equal(isValidTimeWindow('9am', '17:00'), false);
});

test('uploads are checked for type and size', () => {
  const max = 5 * 1024 * 1024;
  assert.equal(checkUpload('photo', 'image/png', 1000, max), null);
  assert.ok(checkUpload('photo', 'application/pdf', 1000, max));
  assert.ok(checkUpload('document', 'image/gif', 1000, max));
  assert.ok(checkUpload('document', 'application/pdf', max + 1, max));
  assert.ok(checkUpload('photo', 'image/png', 0, max));
});

test('file contents are identified by magic bytes, not the file name', () => {
  assert.equal(detectMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), 'image/jpeg');
  assert.equal(detectMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detectMime(new TextEncoder().encode('%PDF-1.7 rest')), 'application/pdf');
  const webp = new TextEncoder().encode('RIFF0000WEBPVP8 ');
  assert.equal(detectMime(webp), 'image/webp');
  // A script disguised as an image is rejected.
  assert.equal(detectMime(new TextEncoder().encode('<script>alert(1)</script>')), null);
});
