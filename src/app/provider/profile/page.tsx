import type { Metadata } from 'next';
import {
  addAvailabilityAction,
  deleteAvailabilityAction,
  reportReviewAction,
  saveServiceAction,
  updateProviderProfileAction,
} from '@/app/actions/provider';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Field, Flash, PageHeader, SectionTitle, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass } from '@/components/styles';
import { WEEKDAY_LABELS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';

export const metadata: Metadata = { title: 'Profile & services' };

export default async function ProviderProfilePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireRole('provider');
  const flash = await searchParams;

  const [profile] = await query<{
    name: string; bio: string | null; skills: string[]; phone: string | null; service_area: string | null;
    street_address: string | null; latitude: number | null; longitude: number | null;
  }>(
    `SELECT u.name, p.bio, p.skills, p.phone, p.service_area, p.street_address, p.latitude, p.longitude
       FROM provider_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1`,
    [user.id],
  );

  const categories = await query<{ id: string; name: string }>(`SELECT id, name FROM service_categories WHERE is_active ORDER BY name`);
  const services = await query<{ id: string; category_id: string; category_name: string; base_price: string; description: string | null; is_active: boolean }>(
    `SELECT s.id, s.category_id, c.name AS category_name, s.base_price, s.description, s.is_active
       FROM provider_services s JOIN service_categories c ON c.id = s.category_id
      WHERE s.provider_id = $1 ORDER BY c.name`,
    [user.id],
  );
  const availability = await query<{ id: string; weekday: number | null; start_time: string | null; end_time: string | null; unavailable_date: string | null }>(
    `SELECT id, weekday, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time,
            to_char(unavailable_date, 'YYYY-MM-DD') AS unavailable_date
       FROM provider_availability WHERE provider_id = $1
      ORDER BY weekday NULLS LAST, start_time, unavailable_date`,
    [user.id],
  );
  const reviews = await query<{ id: string; rating: number; review_text: string | null; created_at: Date; moderation_status: string; customer_name: string }>(
    `SELECT r.id, r.rating, r.review_text, r.created_at, r.moderation_status, u.name AS customer_name
       FROM reviews r JOIN users u ON u.id = r.customer_id
      WHERE r.provider_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
    [user.id],
  );

  return (
    <>
      <PageHeader title="Profile, services & availability" subtitle="Customers see your name, bio, services, prices and service area. Your street address stays private." />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Business profile</SectionTitle>
          <form action={updateProviderProfileAction} className="space-y-4">
            <Field label="Display name" htmlFor="name">
              <input id="name" name="name" type="text" required maxLength={120} defaultValue={profile?.name} className={inputClass} />
            </Field>
            <Field label="Bio" htmlFor="bio" hint="Describe your experience. Up to 1000 characters.">
              <textarea id="bio" name="bio" rows={4} maxLength={1000} defaultValue={profile?.bio ?? ''} className={inputClass} />
            </Field>
            <Field label="Skills" htmlFor="skills" hint="Separate with commas. Up to 15.">
              <input id="skills" name="skills" type="text" defaultValue={(profile?.skills ?? []).join(', ')} className={inputClass} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={profile?.phone ?? ''} maxLength={30} className={inputClass} />
            </Field>
            <Field label="Public service area" htmlFor="service_area" hint="For example: North Side. Shown to customers.">
              <input id="service_area" name="service_area" type="text" defaultValue={profile?.service_area ?? ''} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Street address (private)" htmlFor="street_address" hint="Only ProSolution admins see this.">
              <input id="street_address" name="street_address" type="text" defaultValue={profile?.street_address ?? ''} maxLength={200} className={inputClass} />
            </Field>
            <fieldset className="rounded-xl border border-blue-100 p-3">
              <legend className="px-1 text-sm font-medium text-slate-700">Map pin (optional)</legend>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" htmlFor="latitude">
                  <input id="latitude" name="latitude" type="number" step="any" min={-90} max={90} inputMode="decimal" defaultValue={profile?.latitude ?? ''} className={inputClass} />
                </Field>
                <Field label="Longitude" htmlFor="longitude">
                  <input id="longitude" name="longitude" type="number" step="any" min={-180} max={180} inputMode="decimal" defaultValue={profile?.longitude ?? ''} className={inputClass} />
                </Field>
              </div>
            </fieldset>
            <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Services and base prices</SectionTitle>
            {services.length === 0 ? (
              <EmptyState title="No services yet">Add at least one service so you receive matching requests.</EmptyState>
            ) : (
              <ul className="mb-5 divide-y divide-blue-100">
                {services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{s.category_name}</p>
                      <p className="text-sm text-slate-600">From {formatMoney(s.base_price)}{s.description ? ` · ${s.description}` : ''}</p>
                    </div>
                    <StatusBadge label={s.is_active ? 'Active' : 'Paused'} tone={s.is_active ? 'green' : 'slate'} />
                  </li>
                ))}
              </ul>
            )}
            <form action={saveServiceAction} className="space-y-3 border-t border-blue-100 pt-4">
              <SectionTitle>Add or update a service</SectionTitle>
              <Field label="Service" htmlFor="category_id">
                <select id="category_id" name="category_id" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Choose a category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Base price" htmlFor="base_price" hint="Starting price for a standard job. Quotes can differ.">
                <input id="base_price" name="base_price" type="number" min={0} step="0.01" inputMode="decimal" required className={inputClass} />
              </Field>
              <Field label="Description (optional)" htmlFor="service_description">
                <input id="service_description" name="description" type="text" maxLength={500} className={inputClass} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 accent-blue-700" /> Accepting requests for this service
              </label>
              <SubmitButton variant="secondary" pendingLabel="Saving…">Save service</SubmitButton>
            </form>
          </Card>

          <Card>
            <SectionTitle>Working hours and unavailable dates</SectionTitle>
            {availability.length === 0 ? (
              <p className="mb-4 text-sm text-slate-600">No working hours yet.</p>
            ) : (
              <ul className="mb-5 divide-y divide-blue-100">
                {availability.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-slate-800">
                      {a.weekday !== null ? `${WEEKDAY_LABELS[a.weekday]}: ${a.start_time}–${a.end_time}` : `Unavailable: ${formatDate(a.unavailable_date)}`}
                    </span>
                    <form action={deleteAvailabilityAction}>
                      <input type="hidden" name="availability_id" value={a.id} />
                      <SubmitButton variant="danger" pendingLabel="…" className="min-h-9 px-3 py-1 text-sm">Remove</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-4 border-t border-blue-100 pt-4 sm:grid-cols-2">
              <form action={addAvailabilityAction} className="space-y-3">
                <input type="hidden" name="kind" value="weekly" />
                <SectionTitle>Add working hours</SectionTitle>
                <Field label="Day" htmlFor="weekday">
                  <select id="weekday" name="weekday" defaultValue="1" className={inputClass}>
                    {WEEKDAY_LABELS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start" htmlFor="start_time"><input id="start_time" name="start_time" type="time" required defaultValue="09:00" className={inputClass} /></Field>
                  <Field label="End" htmlFor="end_time"><input id="end_time" name="end_time" type="time" required defaultValue="17:00" className={inputClass} /></Field>
                </div>
                <SubmitButton variant="secondary" pendingLabel="Adding…">Add hours</SubmitButton>
              </form>
              <form action={addAvailabilityAction} className="space-y-3">
                <input type="hidden" name="kind" value="unavailable" />
                <SectionTitle>Block a date</SectionTitle>
                <Field label="Date" htmlFor="unavailable_date">
                  <input id="unavailable_date" name="unavailable_date" type="date" required className={inputClass} />
                </Field>
                <SubmitButton variant="secondary" pendingLabel="Saving…">Block date</SubmitButton>
              </form>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <SectionTitle>Reviews about you</SectionTitle>
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet" />
        ) : (
          <ul className="divide-y divide-blue-100">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-amber-600">{'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span></p>
                  {r.review_text ? <p className="text-slate-700">{r.review_text}</p> : null}
                  <p className="text-xs text-slate-500">{r.customer_name} · {formatDate(r.created_at)} · {r.moderation_status}</p>
                </div>
                {r.moderation_status === 'published' ? (
                  <form action={reportReviewAction}>
                    <input type="hidden" name="review_id" value={r.id} />
                    <SubmitButton variant="secondary" pendingLabel="Reporting…" className="min-h-9 px-3 py-1 text-sm">Report review</SubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
