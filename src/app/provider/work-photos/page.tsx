import type { Metadata } from 'next';
import { uploadWorkPhotoAction } from '@/app/actions/provider';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Field, Flash, PageHeader, SectionTitle } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass } from '@/components/styles';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'WorkProof photos' };

export default async function WorkPhotosPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireRole('provider');
  const flash = await searchParams;

  const jobs = await query<{ id: string; label: string }>(
    `SELECT b.id, c.name || ' · ' || b.status AS label
       FROM bookings b JOIN service_requests r ON r.id = b.request_id JOIN service_categories c ON c.id = r.category_id
      WHERE b.provider_id = $1 AND b.status = 'completed' ORDER BY b.completed_at DESC NULLS LAST LIMIT 50`,
    [user.id],
  );
  const photos = await query<{ id: string; caption: string | null; created_at: Date }>(
    `SELECT id, caption, created_at FROM work_photos WHERE provider_id = $1 ORDER BY created_at DESC LIMIT 60`,
    [user.id],
  );

  return (
    <>
      <PageHeader
        title="WorkProof"
        subtitle="Show completed work. Photos are linked to your history and shown on your public profile."
      />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle>Add photos</SectionTitle>
          <form action={uploadWorkPhotoAction} encType="multipart/form-data" className="space-y-4">
            <Field label="Photos" htmlFor="photos" hint="Up to 6 at a time. JPG, PNG or WebP, 5 MB each.">
              <input
                id="photos"
                name="photos"
                type="file"
                multiple
                required
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-semibold file:text-blue-900"
              />
            </Field>
            <Field label="Caption (optional)" htmlFor="caption">
              <input id="caption" name="caption" type="text" maxLength={200} className={inputClass} />
            </Field>
            <Field label="Linked job (optional)" htmlFor="booking_id">
              <select id="booking_id" name="booking_id" defaultValue="" className={inputClass}>
                <option value="">Not linked to a job</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
              </select>
            </Field>
            <SubmitButton pendingLabel="Uploading…" className="w-full">Upload photos</SubmitButton>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>Your gallery</SectionTitle>
          {photos.length === 0 ? (
            <EmptyState title="No work photos yet">Photos of completed jobs help customers choose you.</EmptyState>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-xl border border-blue-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/work-photo/${p.id}`} alt={p.caption ?? 'Work photo'} loading="lazy" className="aspect-square w-full object-cover" />
                  <p className="truncate p-2 text-xs text-slate-600">{p.caption ?? formatDate(p.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
