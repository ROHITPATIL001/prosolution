import { CURRENCY } from './constants';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY });

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return money.format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatRating(avg: number | null | undefined, count: number): string {
  if (!count || !avg) return 'No reviews yet';
  return `${avg.toFixed(1)} ★ (${count} review${count === 1 ? '' : 's'})`;
}
