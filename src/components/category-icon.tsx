import {
  Zap,
  Wrench,
  Car,
  Hammer,
  Sparkles,
  GraduationCap,
  Paintbrush,
  Settings,
  Wind,
  Sprout,
  Bug,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_MAP: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  electrician: { icon: Zap, bg: 'bg-amber-50', text: 'text-amber-600' },
  plumber: { icon: Wrench, bg: 'bg-cyan-50', text: 'text-cyan-600' },
  mechanic: { icon: Car, bg: 'bg-blue-50', text: 'text-blue-600' },
  carpenter: { icon: Hammer, bg: 'bg-orange-50', text: 'text-orange-600' },
  cleaning: { icon: Sparkles, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  tutor: { icon: GraduationCap, bg: 'bg-purple-50', text: 'text-purple-600' },
  painter: { icon: Paintbrush, bg: 'bg-rose-50', text: 'text-rose-600' },
  'appliance repair': { icon: Settings, bg: 'bg-indigo-50', text: 'text-indigo-600' },
  'ac repair': { icon: Wind, bg: 'bg-sky-50', text: 'text-sky-600' },
  gardening: { icon: Sprout, bg: 'bg-lime-50', text: 'text-lime-700' },
  'pest control': { icon: Bug, bg: 'bg-red-50', text: 'text-red-600' },
};

export function getCategoryMeta(name: string) {
  const normalized = name.toLowerCase().trim();
  return CATEGORY_MAP[normalized] ?? { icon: Briefcase, bg: 'bg-slate-100', text: 'text-slate-600' };
}

export function CategoryIcon({
  name,
  className = 'h-5 w-5',
  variant = 'badge',
}: {
  name: string;
  className?: string;
  variant?: 'badge' | 'plain';
}) {
  const meta = getCategoryMeta(name);
  const Icon = meta.icon;

  if (variant === 'plain') {
    return <Icon className={className} aria-hidden="true" />;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl p-2.5 ${meta.bg} ${meta.text}`}
      aria-hidden="true"
    >
      <Icon className={className} />
    </span>
  );
}
