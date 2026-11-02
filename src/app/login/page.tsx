import type { Metadata } from 'next';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { Card, Field, Flash } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, linkClass } from '@/components/styles';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md py-6 sm:py-12">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-blue-900">Sign in to ProSolution</h1>
        <p className="mt-2 text-slate-600">Find trusted local providers and compare quotations transparently.</p>
      </div>

      <Card>
        <Flash ok={params.ok} error={params.error} />
        <form action={loginAction} className="space-y-4">
          <Field label="Email address" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </Field>
          <SubmitButton pendingLabel="Signing in…" className="w-full">Sign in</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to ProSolution?{' '}
          <Link href="/register" className={linkClass}>Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
