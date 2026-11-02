import type { RequestStatus } from './rules';

/** Display currency. Change to the currency your demo uses (ISO 4217 code). */
export const CURRENCY = 'USD';

export const QUOTE_EXPIRY_DAYS = Number(process.env.QUOTE_EXPIRY_DAYS ?? 7);
export const COMMISSION_RATE = Number(process.env.COMMISSION_RATE ?? 0.05);

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Request submitted',
  quotations_received: 'Quotations received',
  quotation_accepted: 'Quotation accepted',
  provider_on_the_way: 'Provider on the way',
  work_in_progress: 'Work in progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Verified',
  rejected: 'Rejected',
  needs_more_info: 'Needs more information',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  identity: 'Identity document',
  certificate: 'Trade certificate',
  licence: 'Licence',
  insurance: 'Insurance',
  other: 'Other',
};

export const COMPLAINT_CATEGORY_LABELS: Record<string, string> = {
  payment: 'Payment',
  quality: 'Quality of work',
  behaviour: 'Behaviour',
  cancellation: 'Cancellation',
  other: 'Other',
};

export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
