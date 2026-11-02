import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { isUuid } from '@/lib/errors';
import { Card, EmptyState, PageHeader, SectionTitle, StatusBadge, Avatar, StarRating } from '@/components/ui';
import { buttonClass } from '@/components/styles';
import { formatDate, formatMoney } from '@/lib/format';
import { WEEKDAY_LABELS } from '@/lib/constants';
import { CategoryIcon } from '@/components/category-icon';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Camera,
  Coins,
  Star,
  CheckCircle2,
  Plus,
  ArrowRight,
  Info,
} from 'lucide-react';

export const metadata: Metadata = { title: 'Provider Profile' };

export default async function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('customer');
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [provider] = await query<{
    id: string;
    name: string;
    bio: string | null;
    skills: string[];
    service_area: string | null;
    avg_rating: number;
    review_count: number;
  }>(
    `SELECT u.id, u.name, p.bio, p.skills, p.service_area,
            COALESCE((SELECT avg(rating)::float8 FROM reviews r WHERE r.provider_id = u.id AND r.moderation_status = 'published'), 0) AS avg_rating,
            (SELECT count(*)::int FROM reviews r WHERE r.provider_id = u.id AND r.moderation_status = 'published') AS review_count
       FROM provider_profiles p JOIN users u ON u.id = p.user_id
      WHERE u.id = $1 AND p.verification_status = 'approved' AND u.account_status = 'active'`,
    [id],
  );
  if (!provider) notFound();

  const services = await query<{ category_name: string; base_price: string; description: string | null }>(
    `SELECT c.name AS category_name, s.base_price, s.description
       FROM provider_services s JOIN service_categories c ON c.id = s.category_id
      WHERE s.provider_id = $1 AND s.is_active ORDER BY c.name`,
    [id],
  );

  const availability = await query<{ weekday: number | null; start_time: string | null; end_time: string | null }>(
    `SELECT weekday, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
       FROM provider_availability WHERE provider_id = $1 AND weekday IS NOT NULL ORDER BY weekday, start_time`,
    [id],
  );

  // WorkProof: work photos plus recent eligible reviews (FR-06). Photos are served through the authorised file route.
  const photos = await query<{ id: string; caption: string | null; created_at: Date }>(
    `SELECT id, caption, created_at FROM work_photos WHERE provider_id = $1 ORDER BY created_at DESC LIMIT 12`,
    [id],
  );
  const reviews = await query<{ rating: number; review_text: string | null; created_at: Date; customer_name: string }>(
    `SELECT r.rating, r.review_text, r.created_at, u.name AS customer_name
       FROM reviews r JOIN users u ON u.id = r.customer_id
      WHERE r.provider_id = $1 AND r.moderation_status = 'published'
      ORDER BY r.created_at DESC LIMIT 10`,
    [id],
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <PageHeader
        title=""
        backHref="/customer/providers"
        backLabel="Back to verified providers"
      />

      {/* Provider Hero Header Card */}
      <Card className="-mt-6 bg-gradient-to-br from-white via-white to-blue-50/50 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 sm:items-center">
            <Avatar name={provider.name} size="xl" verified={true} />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {provider.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  Verified by ProSolution
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
                {provider.service_area ? (
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Serves {provider.service_area}
                  </span>
                ) : null}
                <StarRating rating={provider.avg_rating} reviewCount={num(provider.review_count)} size="md" />
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              href="/customer/requests/new"
              className={`${buttonClass} w-full sm:w-auto shadow-md`}
            >
              <Plus className="h-4 w-4" />
              <span>Request a quotation</span>
            </Link>
          </div>
        </div>

        {/* Verification disclaimer banner */}
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-blue-50/80 p-3 text-xs text-blue-900 border border-blue-100">
          <Info className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
          <span>
            Verified badge confirms ProSolution reviewed official identification and qualifications submitted by this provider. It does not constitute a legal certification or guarantee of skill.
          </span>
        </div>
      </Card>

      {/* Main Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* About & Skills */}
          <Card>
            <SectionTitle>About the provider</SectionTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {provider.bio ?? 'This provider has not added a detailed biography yet.'}
            </p>
            {provider.skills.length > 0 ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Skills & expertise</h3>
                <ul className="flex flex-wrap gap-2">
                  {provider.skills.map((skill) => (
                    <li key={skill}>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                        {skill}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          {/* WorkProof Gallery */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <SectionTitle className="mb-0">WorkProof™: Completed jobs</SectionTitle>
                <p className="text-xs text-slate-500 mt-0.5">Verified photos uploaded from real completed bookings</p>
              </div>
              <Camera className="h-5 w-5 text-slate-400" />
            </div>

            {photos.length === 0 ? (
              <EmptyState
                title="No work photos uploaded yet"
                icon={<Camera className="h-6 w-6 text-slate-400" />}
              >
                Photos will appear here as the provider completes jobs and shares work proof.
              </EmptyState>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <li
                    key={photo.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xs transition hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/work-photo/${photo.id}`}
                      alt={photo.caption ?? 'Completed job photo'}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="p-2.5 bg-white">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {photo.caption ?? 'Work completed'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(photo.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Customer Reviews */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <SectionTitle className="mb-0">Verified customer reviews</SectionTitle>
                <p className="text-xs text-slate-500 mt-0.5">Reviews left exclusively by customers who completed a booking with this provider</p>
              </div>
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
            </div>

            {reviews.length === 0 ? (
              <EmptyState
                title="No customer reviews yet"
                icon={<Star className="h-6 w-6 text-slate-400" />}
              >
                Customer ratings and feedback will appear here after initial jobs are completed.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {reviews.map((review, i) => (
                  <li key={i} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={review.customer_name} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{review.customer_name}</p>
                          <p className="text-[11px] text-slate-400">{formatDate(review.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.review_text ? (
                      <p className="mt-2 text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        &ldquo;{review.review_text}&rdquo;
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right Sidebar (1 col) */}
        <div className="space-y-6">
          {/* Services & Base Pricing */}
          <Card>
            <SectionTitle>Services & base rates</SectionTitle>
            <p className="text-xs text-slate-500 mb-3">Upfront base rates before custom materials or parts</p>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s.category_name} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-blue-50/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon name={s.category_name} className="h-4 w-4" />
                      <span className="truncate text-xs font-bold text-slate-900">{s.category_name}</span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-blue-900 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                      from {formatMoney(s.base_price)}
                    </span>
                  </div>
                  {s.description ? (
                    <p className="mt-1.5 text-xs text-slate-600 leading-normal">{s.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          {/* Working Hours */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle className="mb-0">Working hours</SectionTitle>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>

            {availability.length === 0 ? (
              <p className="text-xs text-slate-500">Working hours are flexible. Describe your requested time in your job request.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {availability.map((a, i) => (
                  <li key={i} className="flex justify-between py-2 text-slate-700">
                    <span className="font-semibold text-slate-800">{WEEKDAY_LABELS[a.weekday ?? 0]}</span>
                    <span className="font-medium text-slate-600">{a.start_time} – {a.end_time}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Direct CTA Card */}
          <Card className="bg-blue-50/60 border-blue-200 text-center p-5">
            <h3 className="text-sm font-bold text-blue-950">Ready to hire {provider.name.split(' ')[0]}?</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Post your request with job description and photos. Verified providers will send you detailed FairQuotes.
            </p>
            <Link
              href="/customer/requests/new"
              className={`${buttonClass} mt-4 w-full shadow-sm`}
            >
              <Plus className="h-4 w-4" />
              <span>Post a request</span>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
