import type { Metadata } from 'next';
import { updateCustomerProfileAction } from '@/app/actions/customer';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, Field, Flash, PageHeader, Avatar } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass } from '@/components/styles';
import { User, Phone, Mail, Home, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = { title: 'Customer Profile' };

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireRole('customer');
  const flash = await searchParams;
  const [profile] = await query<{
    name: string;
    email: string;
    phone: string | null;
    address_preferences: string | null;
  }>(
    `SELECT u.name, u.email, cp.phone, cp.address_preferences
       FROM users u LEFT JOIN customer_profiles cp ON cp.user_id = u.id WHERE u.id = $1`,
    [user.id],
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Your profile"
        subtitle="Keep your name, phone and address preferences up to date. Only the single provider you accept can view your contact information."
      />

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5">
          <Avatar name={profile?.name ?? user.name} size="lg" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{profile?.name ?? user.name}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{profile?.email ?? user.email}</span>
            </p>
          </div>
        </div>

        <Flash ok={flash.ok} error={flash.error} />

        <form action={updateCustomerProfileAction} className="space-y-4">
          <Field label="Full name" htmlFor="name" required>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={profile?.name}
                required
                maxLength={120}
                autoComplete="name"
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <Field
            label="Email address"
            htmlFor="email"
            hint="Email cannot be changed here. Contact support if you need to update it."
          >
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={profile?.email ?? ''}
                readOnly
                className={`${inputClass} pl-10 bg-slate-50 text-slate-500 cursor-not-allowed`}
              />
            </div>
          </Field>

          <Field label="Phone number" htmlFor="phone" hint="Optional, used by the provider you accept to coordinate arrival.">
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={profile?.phone ?? ''}
                maxLength={30}
                placeholder="e.g. +1 555 0100"
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <Field
            label="Address preferences (optional)"
            htmlFor="address_preferences"
            hint="Notes for visiting providers: gate codes, parking instructions, or pet notifications."
          >
            <div className="relative">
              <textarea
                id="address_preferences"
                name="address_preferences"
                rows={3}
                maxLength={300}
                defaultValue={profile?.address_preferences ?? ''}
                placeholder="e.g. Ring the side doorbell. Parking available in driveway."
                className={inputClass}
              />
            </div>
          </Field>

          <div className="pt-2">
            <SubmitButton pendingLabel="Saving profile…" className="w-full sm:w-auto font-bold">
              Save profile
            </SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
