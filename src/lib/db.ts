import 'server-only';
import { Pool, PoolClient, QueryResultRow } from '@neondatabase/serverless';

// One pool per server process. Neon serverless uses WebSockets, so transactions
// (needed for quotation acceptance) work through Pool.connect().
export type TxClient = PoolClient;
export type Client = PoolClient;

const globalForDb = globalThis as unknown as { prosolutionPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.');
  }
  return new Pool({ connectionString });
}

export const pool: Pool = globalForDb.prosolutionPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.prosolutionPool = pool;

/** Runs a single parameterised query. Always pass user input as `params`, never inside `text`. */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/**
 * Runs `work` inside a database transaction. Throwing inside `work` rolls everything back.
 * Used for quotation acceptance and booking status changes so they are all-or-nothing.
 */
export async function withTransaction<T>(work: (tx: TxClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Neon returns SQL numeric values as strings. Convert them explicitly. */
export function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** PostgreSQL error code for unique-constraint violations. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}
