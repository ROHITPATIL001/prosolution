import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, EmptyState, Field, PageHeader, Pager, StatusBadge, Avatar, StarRating } from '@/components/ui';
import { buttonClass, inputClass, secondaryButtonClass } from '@/components/styles';
import { formatMoney } from '@/lib/format';
import { PAGE_SIZE, parsePage } from '@/lib/rules';
import { WEEKDAY_LABELS } from '@/lib/constants';
import { CategoryIcon } from '@/components/category-icon';
import {
  Search,
  MapPin,
  Coins,
  Calendar,
  Filter,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const metadata: Metadata = { title: 'Find Verified Providers' };

type SearchParams = Record<string, string | undefined>;

type ProviderRow = {
  id: string;
  name: string;
  bio: string | null;
  service_area: string | null;
  skills: string[];
  category_name: string;
  base_price: string;
  avg_rating: number;
  review_count: number;
};

export default async function ProviderSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('customer');
  const params = await searchParams;

  const categoryId = params.category ?? null;
  const area = params.area?.trim() || null;
  const maxPrice = params.max_price ? Number(params.max_price) : null;
  const minRating = params.min_rating ? Number(params.min_rating) : null;
  const weekday = params.weekday !== undefined && params.weekday !== '' ? Number(params.weekday) : null;
  const page = parsePage(params.page);

  const categories = await query<{ id: string; name: string }>(
    `SELECT id, name FROM service_categories WHERE is_active ORDER BY name`,
  );

  // Only verified (approved) providers appear in discovery (FR-05, Section 9).
  const rows = await query<ProviderRow>(
    `SELECT u.id, u.name, p.bio, p.service_area, p.skills,
            c.name AS category_name, s.base_price,
            COALESCE(r.avg_rating, 0)::float8 AS avg_rating,
            COALESCE(r.review_count, 0)::int AS review_count
       FROM provider_profiles p
       JOIN users u ON u.id = p.user_id AND u.account_status = 'active'
       JOIN provider_services s ON s.provider_id = p.user_id AND s.is_active
       JOIN service_categories c ON c.id = s.category_id
       LEFT JOIN LATERAL (
         SELECT avg(rv.rating)::float8 AS avg_rating, count(*)::int AS review_count
           FROM reviews rv WHERE rv.provider_id = p.user_id AND rv.moderation_status = 'published'
       ) r ON true
      WHERE p.verification_status = 'approved'
        AND ($1::uuid IS NULL OR s.category_id = $1::uuid)
        AND ($2::text IS NULL OR p.service_area ILIKE '%' || $2::text || '%')
        AND ($3::numeric IS NULL OR s.base_price <= $3::numeric)
        AND ($4::float8 IS NULL OR COALESCE(r.avg_rating, 0) >= $4::float8)
        AND ($5::int IS NULL OR EXISTS (
              SELECT 1 FROM provider_availability a WHERE a.provider_id = p.user_id AND a.weekday = $5::int))
      ORDER BY u.name
      LIMIT $6 OFFSET $7`,
    [
      categoryId && /^[0-9a-f-]{36}$/i.test(categoryId) ? categoryId : null,
      area,
      maxPrice !== null && Number.isFinite(maxPrice) ? maxPrice : null,
      minRating !== null && Number.isFinite(minRating) ? minRating : null,
      weekday !== null && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : null,
      PAGE_SIZE + 1,
      (page - 1) * PAGE_SIZE,
    ],
  );
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  const filterParams: Record<string, string> = {};
  for (const key of ['category', 'area', 'max_price', 'min_rating', 'weekday'] as const) {
    if (params[key]) filterParams[key] = params[key]!;
  }

  const hasActiveFilters = Boolean(params.category || params.area || params.max_price || params.min_rating || params.weekday);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find Verified Providers"
        subtitle="Every provider has submitted identity and qualification documents for verification. Compare upfront rates and genuine customer reviews."
      />

      {/* Category Filter Chips / Carousel */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link
          href="/customer/providers"
          className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition ${
            !params.category
              ? 'border-blue-600 bg-blue-700 text-white shadow-xs'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span>All Services</span>
        </Link>
        {categories.map((c) => {
          const isSelected = params.category === c.id;
          return (
            <Link
              key={c.id}
              href={`/customer/providers?category=${c.id}${params.area ? `&area=${encodeURIComponent(params.area)}` : ''}`}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition ${
                isSelected
                  ? 'border-blue-600 bg-blue-700 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CategoryIcon name={c.name} variant="plain" className="h-4 w-4" />
              <span>{c.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <Card className="p-4 sm:p-5">
        <form method="get" className="space-y-4">
          <input type="hidden" name="category" value={params.category ?? ''} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Location / Area" htmlFor="area">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="area"
                  name="area"
                  type="text"
                  defaultValue={params.area ?? ''}
                  placeholder="e.g. Central District"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>

            <Field label="Max base price" htmlFor="max_price" hint="Call-out / base job rate">
              <div className="relative">
                <Coins className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="max_price"
                  name="max_price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="1"
                  defaultValue={params.max_price ?? ''}
                  placeholder="Any price"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>

            <Field label="Customer rating" htmlFor="min_rating">
              <select id="min_rating" name="min_rating" defaultValue={params.min_rating ?? ''} className={inputClass}>
                <option value="">Any rating</option>
                <option value="4">★ 4.0 stars and above</option>
                <option value="4.5">★ 4.5 stars and above</option>
                <option value="4.8">★ 4.8 stars and above</option>
              </select>
            </Field>

            <Field label="Available on" htmlFor="weekday">
              <select id="weekday" name="weekday" defaultValue={params.weekday ?? ''} className={inputClass}>
                <option value="">Any day of week</option>
                {WEEKDAY_LABELS.map((day, i) => (
                  <option key={day} value={i}>{day}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{visible.length}</span> verified providers
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters ? (
                <Link
                  href="/customer/providers"
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset filters</span>
                </Link>
              ) : null}
              <button type="submit" className={buttonClass}>
                <Filter className="h-4 w-4" />
                <span>Apply filters</span>
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* Provider Cards Grid */}
      {visible.length === 0 ? (
        <EmptyState
          title="No providers match your filters"
          icon={<Search className="h-6 w-6 text-blue-600" />}
        >
          <p className="mb-4">Try widening your search area or selecting another category.</p>
          <Link href="/customer/providers" className={buttonClass}>
            Clear all filters
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <Card
              key={`${p.id}-${p.category_name}`}
              className="flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div>
                {/* Header with Avatar, Name, Category and Verified Badge */}
                <div className="flex items-start gap-3">
                  <Avatar name={p.name} size="lg" verified={true} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="truncate text-base font-bold text-slate-900">{p.name}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-blue-700 font-semibold">
                      <CategoryIcon name={p.category_name} variant="plain" className="h-3.5 w-3.5" />
                      <span>{p.category_name}</span>
                    </div>
                    <div className="mt-1">
                      <StarRating rating={p.avg_rating} reviewCount={num(p.review_count)} />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p className="mt-3 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                  {p.bio ?? 'Experienced local provider ready to assist with your requests.'}
                </p>

                {/* Skills tags */}
                {p.skills && p.skills.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {p.skills.length > 3 ? (
                      <span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                        +{p.skills.length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Service Area & Price Meta */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                  <div>
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      Service area
                    </span>
                    <span className="mt-0.5 block truncate font-semibold text-slate-800">
                      {p.service_area ?? 'Local area'}
                    </span>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Coins className="h-3.5 w-3.5 text-slate-400" />
                      Starting rate
                    </span>
                    <span className="mt-0.5 block font-bold text-blue-900">
                      {formatMoney(p.base_price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-2">
                <Link
                  href={`/customer/providers/${p.id}`}
                  className="group inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50 hover:border-blue-300"
                >
                  <span>View profile & portfolio</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pager basePath="/customer/providers" page={page} hasNext={hasNext} params={filterParams} />
    </div>
  );
}
