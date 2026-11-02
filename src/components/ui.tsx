import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  XCircle,
  FolderOpen,
} from 'lucide-react';
import { labelClass } from './styles';

export function Card({
  children,
  className = '',
  hoverEffect = false,
}: {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm ${
        hoverEffect ? 'transition-all duration-200 hover:shadow-md hover:border-blue-200' : ''
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  backLabel = 'Back',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 transition w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{backLabel}</span>
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600 max-w-2xl">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className = '',
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-2 ${className}`}>
      <h2 className="text-lg font-bold text-slate-900 tracking-tight">{children}</h2>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

/** Success and error messages passed in the URL by flashRedirect(). */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  if (error) {
    return (
      <div
        role="alert"
        className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 shadow-sm"
      >
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
        <div className="font-medium leading-relaxed">{error}</div>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-sm"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
      <div className="font-medium leading-relaxed">{ok}</div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  icon,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon ?? <FolderOpen className="h-6 w-6" />}
      </div>
      <p className="font-semibold text-slate-800 text-base">{title}</p>
      {children ? <div className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">{children}</div> : null}
    </div>
  );
}

const TONES = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
} as const;

export function StatusBadge({
  label,
  tone = 'blue',
  showIcon = true,
}: {
  label: string;
  tone?: keyof typeof TONES;
  showIcon?: boolean;
}) {
  const getIcon = () => {
    if (!showIcon) return null;
    const lower = label.toLowerCase();
    if (lower.includes('verified')) return <ShieldCheck className="h-3.5 w-3.5 shrink-0" />;
    if (lower.includes('completed') || lower.includes('accepted') || lower.includes('published')) {
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
    }
    if (lower.includes('progress') || lower.includes('pending') || lower.includes('open') || lower.includes('way')) {
      return <Clock className="h-3.5 w-3.5 shrink-0" />;
    }
    if (lower.includes('cancelled') || lower.includes('rejected') || lower.includes('withdrawn')) {
      return <XCircle className="h-3.5 w-3.5 shrink-0" />;
    }
    return null;
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {getIcon()}
      <span>{label}</span>
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  required,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/** Modern visual star rating component */
export function StarRating({
  rating,
  reviewCount,
  showCount = true,
  size = 'sm',
}: {
  rating: number;
  reviewCount?: number;
  showCount?: boolean;
  size?: 'sm' | 'md';
}) {
  const rounded = Math.round((rating || 0) * 10) / 10;
  const starClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const textClass = size === 'md' ? 'text-sm' : 'text-xs';

  if (!reviewCount || reviewCount === 0) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium text-slate-400 ${textClass}`}>
        <Star className={`${starClass} text-slate-300`} />
        <span>New provider</span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center text-amber-500" aria-label={`${rounded} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) => {
          const isFilled = i <= Math.round(rounded);
          return (
            <Star
              key={i}
              className={`${starClass} ${
                isFilled ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'
              }`}
            />
          );
        })}
      </div>
      <span className={`font-bold text-slate-800 ${textClass}`}>{rounded.toFixed(1)}</span>
      {showCount ? (
        <span className={`text-slate-500 ${textClass}`}>
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      ) : null}
    </div>
  );
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-cyan-600 to-blue-700',
  'from-indigo-600 to-purple-700',
  'from-teal-600 to-emerald-700',
  'from-sky-600 to-blue-800',
];

/** Avatar with initials, gradient styling and optional verified checkmark badge */
export function Avatar({
  name,
  size = 'md',
  verified = false,
  className = '',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
  className?: string;
}) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0]?.[0] ?? 'P');
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm font-semibold',
    lg: 'h-14 w-14 text-base font-bold',
    xl: 'h-20 w-20 text-xl font-bold',
  }[size];

  const badgeSize = {
    sm: 'h-3.5 w-3.5 translate-x-1 translate-y-1',
    md: 'h-4 w-4 translate-x-1 translate-y-1',
    lg: 'h-5 w-5 translate-x-1 translate-y-1',
    xl: 'h-6 w-6 translate-x-1.5 translate-y-1.5',
  }[size];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white uppercase shadow-sm ${sizeClasses}`}
        aria-hidden="true"
      >
        {initials}
      </div>
      {verified ? (
        <span
          className={`absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white shadow-sm ${badgeSize}`}
          title="Verified by ProSolution"
        >
          <ShieldCheck className="h-full w-full p-0.5" />
        </span>
      ) : null}
    </div>
  );
}

/** Previous / next links for paginated lists. Uses plain links, so it works without JavaScript. */
export function Pager({
  basePath,
  page,
  hasNext,
  params = {},
}: {
  basePath: string;
  page: number;
  hasNext: boolean;
  params?: Record<string, string>;
}) {
  const href = (p: number) => {
    const search = new URLSearchParams({ ...params, page: String(p) });
    return `${basePath}?${search.toString()}`;
  };
  if (page === 1 && !hasNext) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Page {page}</span>
      {hasNext ? (
        <Link
          href={href(page + 1)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <span>Next</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
