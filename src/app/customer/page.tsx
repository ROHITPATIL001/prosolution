import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, num } from '@/lib/db';
import { Card, EmptyState, PageHeader, SectionTitle, Stat, StatusBadge } from '@/components/ui';
import { buttonClass, linkClass, secondaryButtonClass } from '@/components/styles';
import { REQUEST_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import type { RequestStatus } from '@/lib/rules';
import { CategoryIcon } from '@/components/category-icon';
import {
  Plus,
  Search,
  ClipboardList,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Coins,
  Sparkles,
} from 'lucide-react';

export const metadata: Metadata = { title: 'Customer Dashboard' };

const QUICK_CATEGORIES = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Cleaning',
  'Appliance Repair',
  'AC Repair',
];

export default async function CustomerDashboard() {
  const user = await requireRole('customer');

  const [counts] = await query<{ open: string; active: string; completed: string }>(
    `SELECT count(*) FILTER (WHERE status IN ('submitted', 'quotations_received')) AS open,
            count(*) FILTER (WHERE status IN ('quotation_accepted', 'provider_on_the_way', 'work_in_progress')) AS active,
            count(*) FILTER (WHERE status = 'completed') AS completed
       FROM service_requests WHERE customer_id = $1`,
    [user.id],
  );

  const recent = await query<{
    id: string;
    description: string;
    status: RequestStatus;
    created_at: Date;
    category: string;
    quote_count: string;
  }>(
    `SELECT r.id, r.description, r.status, r.created_at, c.name AS category,
            (SELECT count(*)::text FROM quotations q WHERE q.request_id = r.id AND q.status = 'active') AS quote_count
       FROM service_requests r
       JOIN service_categories c ON c.id = r.category_id
      WHERE r.customer_id = $1
      ORDER BY r.created_at DESC LIMIT 5`,
    [user.id],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Compare transparent FairQuotes from verified local professionals and track your bookings."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/customer/providers" className={secondaryButtonClass}>
              <Search className="h-4 w-4" />
              <span>Find providers</span>
            </Link>
            <Link href="/customer/requests/new" className={buttonClass}>
              <Plus className="h-4 w-4" />
              <span>Post new request</span>
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat
          label="Open requests"
          value={num(counts?.open)}
          hint="Waiting for or reviewing quotes"
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <Stat
          label="Active bookings"
          value={num(counts?.active)}
          hint="Accepted or in progress"
          icon={<Calendar className="h-4 w-4" />}
        />
        <Stat
          label="Completed jobs"
          value={num(counts?.completed)}
          hint="Finished services"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Popular Categories Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Explore popular services</h2>
          <Link href="/customer/providers" className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1">
            <span>View all</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/customer/providers?area=&category=&query=${encodeURIComponent(cat)}`}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-center shadow-xs transition hover:border-blue-300 hover:shadow-md hover:bg-blue-50/40"
            >
              <CategoryIcon name={cat} className="h-6 w-6" />
              <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 transition line-clamp-1">
                {cat}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Two-Column Layout: Recent Requests & FairQuote Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Requests (2 cols) */}
        <div className="space-y-3 lg:col-span-2">
          <SectionTitle
            action={
              recent.length > 0 ? (
                <Link href="/customer/requests" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                  View all requests
                </Link>
              ) : null
            }
          >
            Recent requests
          </SectionTitle>

          {recent.length === 0 ? (
            <EmptyState
              title="No service requests yet"
              icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
            >
              <p className="mb-4">Describe the job you need help with and receive itemized quotations from verified local professionals.</p>
              <Link href="/customer/requests/new" className={buttonClass}>
                <Plus className="h-4 w-4 mr-1.5" />
                Post your first request
              </Link>
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => {
                const quoteNum = Number(r.quote_count || 0);
                return (
                  <Link
                    key={r.id}
                    href={`/customer/requests/${r.id}`}
                    className="group block rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <CategoryIcon name={r.category} className="h-5 w-5" />
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-900 group-hover:text-blue-700 transition">
                            {r.category}
                          </h3>
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 leading-relaxed">
                            {r.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge label={REQUEST_STATUS_LABELS[r.status]} />
                        {quoteNum > 0 ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                            {quoteNum} {quoteNum === 1 ? 'quote received' : 'quotes received'}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">{formatDateTime(r.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar: FairQuote Guarantee Card */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-0 shadow-md">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-blue-300" />
              <span>FairQuote Standard</span>
            </div>
            <h3 className="mt-2 text-lg font-black tracking-tight text-white">Itemized Transparent Pricing</h3>
            <p className="mt-2 text-xs leading-relaxed text-blue-100">
              Providers break down labour and material estimates upfront. You compare ratings, warranties, and prices before accepting.
            </p>
            <div className="mt-4 space-y-2.5 border-t border-blue-600/60 pt-3 text-xs text-blue-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>Verified documents reviewed by admin</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-300 shrink-0" />
                <span>Clear labour + material breakdown</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-300 shrink-0" />
                <span>Completion time & warranty commitment</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-slate-900">Need help with something else?</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Browse our verified providers directory to view portfolios, previous work proof, and customer feedback.
            </p>
            <Link
              href="/customer/providers"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 hover:text-blue-900"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Browse all providers</span>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
