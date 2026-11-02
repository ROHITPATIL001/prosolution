import { isUniqueViolation } from './db';
import { flashRedirect } from './forms';

/** An expected, user-facing failure (for example "this quotation has expired"). */
export class UserError extends Error {}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Runs a server action body. Expected failures become a readable message on `path`.
 * Unexpected errors are re-thrown so they reach the error boundary and the logs.
 * Redirects from flashRedirect() or redirect() pass straight through.
 */
export async function handleActionErrors(path: string, work: () => Promise<void>): Promise<void> {
  let errorMessage: string | null = null;
  try {
    await work();
  } catch (error) {
    if (error instanceof UserError) {
      errorMessage = error.message;
    } else if (isUniqueViolation(error)) {
      errorMessage = 'This change conflicts with an existing record. Refresh the page and try again.';
    } else {
      throw error;
    }
  }
  if (errorMessage !== null) {
    flashRedirect(path, 'error', errorMessage);
  }
}
