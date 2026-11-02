// Pure business rules for ProSolution.
//
// This file deliberately has NO imports so it can be unit-tested directly with
// Node's built-in TypeScript support (see tests/rules.test.ts). Keep it free of
// database, framework and environment code.

export const REQUEST_STATUSES = [
  'submitted',
  'quotations_received',
  'quotation_accepted',
  'provider_on_the_way',
  'work_in_progress',
  'completed',
  'cancelled',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

// Bookings follow the same lifecycle as the FR-15 status list.
export type BookingStatus = RequestStatus;
export const BOOKING_STATUS_LIST: readonly BookingStatus[] = REQUEST_STATUSES;

export const QUOTATION_STATUSES = ['active', 'withdrawn', 'accepted', 'not_selected'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'needs_more_info';
export type VerificationDecision = 'approved' | 'rejected' | 'needs_more_info';

export type Check = { ok: true } | { ok: false; reason: string };

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

// ---------------------------------------------------------------------------
// Booking lifecycle (FR-15, FR-16)
// ---------------------------------------------------------------------------

const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  submitted: [],
  quotations_received: [],
  quotation_accepted: ['provider_on_the_way', 'cancelled'],
  provider_on_the_way: ['work_in_progress', 'cancelled'],
  work_in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

export function allowedNextBookingStatuses(from: BookingStatus): readonly BookingStatus[] {
  return BOOKING_TRANSITIONS[from];
}

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

/** Cancellation is allowed until the provider starts the work. */
export function canCancelBooking(status: BookingStatus): boolean {
  return status === 'quotation_accepted' || status === 'provider_on_the_way';
}

/** A customer may withdraw a request only before any quotation has been accepted. */
export function canCancelRequest(status: RequestStatus): boolean {
  return status === 'submitted' || status === 'quotations_received';
}

// ---------------------------------------------------------------------------
// Quotations (FR-10, FR-12, FR-13)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

export function quotationExpiresAt(createdAt: Date, expiryDays: number): Date {
  return new Date(createdAt.getTime() + expiryDays * DAY_MS);
}

export function isQuotationExpired(
  quotation: { status: QuotationStatus; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  return quotation.status === 'active' && quotation.expiresAt.getTime() <= now.getTime();
}

export function checkQuotationAcceptance(input: {
  requestStatus: RequestStatus;
  quotation: { status: QuotationStatus; expiresAt: Date } | null;
  now?: Date;
}): Check {
  const now = input.now ?? new Date();
  const quotation = input.quotation;

  if (!quotation) return fail('That quotation could not be found for this request.');
  if (input.requestStatus !== 'quotations_received') {
    return fail('This request is no longer open for quotation acceptance.');
  }
  if (quotation.status === 'withdrawn') return fail('The provider has withdrawn this quotation.');
  if (quotation.status !== 'active') return fail('Another quotation has already been accepted for this request.');
  if (isQuotationExpired(quotation, now)) return fail('This quotation has expired. Ask the provider for a new one.');
  return { ok: true };
}

const toCents = (value: number): number => Math.round(value * 100);

/** Returns an error message, or null when the amounts are acceptable. */
export function validateQuoteAmounts(amounts: { total: number; labour: number; materials: number }): string | null {
  const values = [amounts.total, amounts.labour, amounts.materials];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return 'Amounts must be zero or positive numbers.';
  }
  if (amounts.total <= 0) return 'The estimated total must be greater than zero.';
  if (toCents(amounts.total) < toCents(amounts.labour) + toCents(amounts.materials)) {
    return 'The estimated total must be at least the labour plus material costs.';
  }
  return null;
}

/** Simulated platform commission for reporting only (FR-23). No money is collected. */
export function calculateCommission(total: number, rate: number): number {
  return Math.round(total * rate * 100) / 100;
}

// ---------------------------------------------------------------------------
// Reviews (FR-17)
// ---------------------------------------------------------------------------

export function checkReviewEligibility(input: {
  bookingStatus: BookingStatus;
  bookingCustomerId: string;
  userId: string;
  alreadyReviewed: boolean;
}): Check {
  if (input.bookingCustomerId !== input.userId) return fail('Only the customer on this booking can review it.');
  if (input.bookingStatus !== 'completed') {
    return fail('You can review a provider only after the booking is marked completed.');
  }
  if (input.alreadyReviewed) return fail('You have already reviewed this booking.');
  return { ok: true };
}

export function validateRating(rating: number, text: string): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'Choose a rating from 1 to 5 stars.';
  if (text.length > 1000) return 'Reviews must be 1000 characters or fewer.';
  return null;
}

// ---------------------------------------------------------------------------
// Verification (FR-05, Section 9)
// ---------------------------------------------------------------------------

export function isVerificationDecision(value: string): value is VerificationDecision {
  return value === 'approved' || value === 'rejected' || value === 'needs_more_info';
}

/** Rejecting or requesting more information must explain why. */
export function verificationNotesRequired(decision: VerificationDecision): boolean {
  return decision !== 'approved';
}

// ---------------------------------------------------------------------------
// Location, pagination and text helpers
// ---------------------------------------------------------------------------

/** Great-circle distance in kilometres (haversine formula). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusKm = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const PAGE_SIZE = 20;

export function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 1;
}

/** Splits a comma-separated skills field into a clean, de-duplicated list. */
export function normalizeSkills(raw: string): string[] {
  const seen = new Map<string, string>(); // lower-case key -> first spelling seen
  for (const part of raw.split(',')) {
    const skill = part.trim().replace(/\s+/g, ' ');
    if (!skill || skill.length > 40) continue;
    const key = skill.toLowerCase();
    if (!seen.has(key)) seen.set(key, skill);
    if (seen.size >= 15) break;
  }
  return [...seen.values()];
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

/** "HH:MM" strings compare correctly as text, so a simple comparison is enough. */
export function isValidTimeWindow(startTime: string, endTime: string): boolean {
  const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  return pattern.test(startTime) && pattern.test(endTime) && endTime > startTime;
}

// ---------------------------------------------------------------------------
// File uploads (FR-25, Section 15)
// ---------------------------------------------------------------------------

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export function checkUpload(
  kind: 'photo' | 'document',
  declaredType: string,
  sizeBytes: number,
  maxBytes: number,
): string | null {
  const allowed: readonly string[] = kind === 'photo' ? PHOTO_TYPES : DOCUMENT_TYPES;
  if (!allowed.includes(declaredType)) {
    return kind === 'photo' ? 'Photos must be JPG, PNG or WebP.' : 'Documents must be PDF, JPG or PNG.';
  }
  if (sizeBytes <= 0) return 'The selected file is empty.';
  if (sizeBytes > maxBytes) return `Files must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`;
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

/**
 * Identifies a file by its leading "magic" bytes instead of trusting the
 * browser-supplied MIME type. Returns null for anything unrecognised.
 */
export function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === '%PDF') return 'application/pdf';
  return null;
}
