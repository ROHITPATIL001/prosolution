import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db';

export type Role = 'customer' | 'provider' | 'admin';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const COOKIE_NAME = 'ps_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days
const BCRYPT_COST = 12;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters.');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

/** Token format: base64url(JSON payload) + "." + HMAC signature. */
function createToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_SECONDS * 1000, n: randomBytes(8).toString('hex') }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: string; exp?: number };
    if (!data.uid || !data.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function setSession(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Returns the signed-in user, or null. The role and account status are always
 * re-read from the database, so suspended accounts lose access immediately and
 * a tampered cookie cannot grant a role.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = readToken(token);
  if (!userId) return null;

  const rows = await query<{ id: string; name: string; email: string; role: Role; account_status: string }>(
    `SELECT id, name, email, role, account_status FROM users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user || user.account_status !== 'active') return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Server-side authorisation. Call this in every protected page, layout and server action. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(homePathFor(user.role));
  return user;
}

export function homePathFor(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'provider') return '/provider';
  return '/customer';
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
