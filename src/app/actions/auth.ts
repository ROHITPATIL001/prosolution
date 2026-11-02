'use server';

import { redirect } from 'next/navigation';
import { clearSession, homePathFor, hashPassword, setSession, verifyPassword, type Role } from '@/lib/auth';
import { query, withTransaction, isUniqueViolation } from '@/lib/db';
import { flashRedirect, str } from '@/lib/forms';
import { isValidEmail, passwordProblem } from '@/lib/rules';

export async function registerAction(formData: FormData): Promise<void> {
  const name = str(formData, 'name');
  const email = str(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const role = str(formData, 'role');

  if (!name || name.length > 120) flashRedirect('/register', 'error', 'Enter your full name (up to 120 characters).');
  if (!isValidEmail(email)) flashRedirect('/register', 'error', 'Enter a valid email address.');
  const problem = passwordProblem(password);
  if (problem) flashRedirect('/register', 'error', problem);
  if (role !== 'customer' && role !== 'provider') flashRedirect('/register', 'error', 'Choose an account type.');

  const passwordHash = await hashPassword(password);
  let userId: string = '';
  let isDuplicateEmail = false;
  try {
    userId = await withTransaction(async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, email, passwordHash, role],
      );
      const id = inserted.rows[0].id;
      if (role === 'customer') {
        await tx.query(`INSERT INTO customer_profiles (user_id) VALUES ($1)`, [id]);
      } else {
        await tx.query(`INSERT INTO provider_profiles (user_id) VALUES ($1)`, [id]);
      }
      return id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      isDuplicateEmail = true;
    } else {
      throw error;
    }
  }

  if (isDuplicateEmail) {
    flashRedirect('/register', 'error', 'An account with this email already exists. Try signing in instead.');
  }

  await setSession(userId);
  redirect(homePathFor(role as Role));
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = str(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const invalid = 'Email or password is not correct.';

  if (!email || !password) flashRedirect('/login', 'error', 'Enter your email and password.');

  const rows = await query<{ id: string; role: Role; password_hash: string; account_status: string }>(
    `SELECT id, role, password_hash, account_status FROM users WHERE email = $1`,
    [email],
  );
  const user = rows[0];
  let passwordOk = false;
  if (user) {
    passwordOk = await verifyPassword(password, user.password_hash);
  } else {
    // Unknown email: do the same amount of bcrypt work so response time does not reveal which emails exist.
    await hashPassword(password);
  }

  if (!user || !passwordOk) flashRedirect('/login', 'error', invalid);
  if (user.account_status !== 'active') {
    flashRedirect('/login', 'error', 'This account is suspended. Contact ProSolution support.');
  }

  await setSession(user.id);
  redirect(homePathFor(user.role));
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}
