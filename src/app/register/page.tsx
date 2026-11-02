import type { Metadata } from 'next';
import Link from 'next/link';
import { registerAction } from '@/app/actions/auth';
import { Card, Field, Flash } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, linkClass } from '@/components/styles';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md py-6 sm:py-12">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-blue-900">Create your account</h1>
        <p className="mt-2 text-slate-600">Takes less than a minute. Passwords are stored securely.</p>
      </div>

      <Card>
        <Flash error={params.error} />
        <form action={registerAction} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">I want to</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-200 p-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                <input type="radio" name="role" value="customer" defaultChecked className="mt-1 h-4 w-4 accent-blue-700" />
                <span>
                  <span className="block font-semibold text-slate-900">Hire a provider</span>
                  <span className="block text-sm text-slate-600">Post jobs and compare quotes</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-200 p-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                <input type="radio" name="role" value="provider" className="mt-1 h-4 w-4 accent-blue-700" />
                <span>
                  <span className="block font-semibold text-slate-900">Offer my services</span>
                  <span className="block text-sm text-slate-600">Send quotes after verification</span>
                </span>
              </label>
            </div>
          </fieldset>

          <Field label="Full name" htmlFor="name">
            <input id="name" name="name" type="text" autoComplete="name" required maxLength={120} className={inputClass} />
          </Field>
          <Field label="Email address" htmlFor="email">
            <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required className={inputClass} />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters, with a letter and a number.">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
            />
          </Field>

          <SubmitButton pendingLabel="Creating account…" className="w-full">Create account</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link href="/login" className={linkClass}>Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
