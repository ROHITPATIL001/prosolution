import { redirect } from 'next/navigation';

/** Reads a trimmed text field from FormData. Missing fields become an empty string. */
export function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** Reads a numeric field. Returns null when the field is blank or not a finite number. */
export function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Reads uploaded files, ignoring empty file inputs. */
export function files(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

/**
 * Redirects back to a page with a success or error message in the query string.
 * Pages read it with the <Flash> component. Works without client-side JavaScript.
 */
export function flashRedirect(path: string, kind: 'ok' | 'error', message: string): never {
  const separator = path.includes('?') ? '&' : '?';
  redirect(`${path}${separator}${kind}=${encodeURIComponent(message)}`);
}

/** Returns the user's own path if it is a safe, same-site relative path; otherwise the fallback. */
export function safePath(candidate: string, fallback: string): string {
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : fallback;
}
