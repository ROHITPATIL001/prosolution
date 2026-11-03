import 'server-only';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { logoutAction } from '@/app/actions/auth';
import { query } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { secondaryButtonClass } from './styles';
import { Avatar } from './ui';
import {
  LayoutDashboard,
  Search,
  ClipboardList,
  PlusCircle,
  MessageSquare,
  AlertTriangle,
  User,
  Bell,
  LogOut,
  Briefcase,
  Calendar,
  FileCheck,
  Camera,
  Coins,
  ShieldCheck,
  FileText,
  Users,
  Megaphone,
  Star,
  Menu,
  Sparkles,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV: Record<SessionUser['role'], NavItem[]> = {
  customer: [
    { href: '/customer', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/customer/providers', label: 'Find providers', icon: Search },
    { href: '/customer/requests', label: 'My requests', icon: ClipboardList },
    { href: '/customer/requests/new', label: 'New request', icon: PlusCircle },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/complaints', label: 'Complaints', icon: AlertTriangle },
    { href: '/customer/profile', label: 'Profile', icon: User },
  ],
  provider: [
    { href: '/provider', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/provider/requests', label: 'Requests', icon: ClipboardList },
    { href: '/provider/bookings', label: 'Bookings', icon: Calendar },
    { href: '/provider/profile', label: 'Profile & services', icon: Briefcase },
    { href: '/provider/documents', label: 'Verification', icon: FileCheck },
    { href: '/provider/work-photos', label: 'WorkProof', icon: Camera },
    { href: '/provider/earnings', label: 'Earnings', icon: Coins },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/complaints', label: 'Complaints', icon: AlertTriangle },
  ],
  admin: [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/verification', label: 'Verification', icon: ShieldCheck },
    { href: '/admin/accounts', label: 'Accounts', icon: Users },
    { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
    { href: '/admin/reviews', label: 'Reviews', icon: Star },
    { href: '/admin/complaints', label: 'Complaints', icon: AlertTriangle },
    { href: '/admin/promotions', label: 'Promotions & revenue', icon: Megaphone },
  ],
};

const ROLE_LABEL: Record<SessionUser['role'], string> = {
  customer: 'Customer',
  provider: 'Service provider',
  admin: 'Administrator',
};

export async function AppShell({ user, children }: { user: SessionUser | null; children: ReactNode }) {
  if (!user) return <>{children}</>;

  const [{ unread }] = await query<{ unread: string }>(
    `SELECT count(*) AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [user.id],
  );
  const unreadCount = Number(unread);
  const home = user.role === 'admin' ? '/admin' : user.role === 'provider' ? '/provider' : '/customer';
  const items = NAV[user.role];

  return (
    <div className="min-h-screen bg-[#F6F4FA] pb-20 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#ADBBDA]/60 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(61,82,160,0.05)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          {/* Logo */}
          <Link
            href={home}
            className="flex items-center gap-2.5 rounded-xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7091E6]"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3D52A0] to-[#7091E6] text-sm font-black text-white shadow-xs shadow-[#3D52A0]/20"
            >
              PS
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#3D52A0] leading-tight">ProSolution</span>
              <span className="text-[10px] font-semibold text-[#8697C4] tracking-wide uppercase">Marketplace</span>
            </div>
          </Link>

          {/* Desktop Navigation Quick Links */}
          <nav className="hidden md:flex items-center gap-1">
            {items.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#3D52A0]/80 transition hover:bg-[#EDE8F5] hover:text-[#3D52A0]"
                >
                  <Icon className="h-4 w-4 text-[#8697C4]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/about"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#ADBBDA] bg-[#EDE8F5]/90 px-3 py-2 text-xs font-bold text-[#3D52A0] transition hover:bg-[#ADBBDA]/40 hover:shadow-xs shadow-[0_2px_8px_-2px_rgba(61,82,160,0.1)]"
              title="About ProSolution: Architecture & Strategic Blueprint"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#7091E6]" />
              <span>About ProSolution</span>
            </Link>

            <Link
              href="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 hover:text-blue-700 shadow-xs"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span
                  aria-label={`${unreadCount} unread`}
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white shadow-xs animate-pulse"
                >
                  {unreadCount}
                </span>
              ) : null}
            </Link>

            <details className="group relative">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 shadow-xs [&::-webkit-details-marker]:hidden">
                <Avatar name={user.name} size="sm" />
                <span className="hidden sm:inline max-w-28 truncate">{user.name.split(' ')[0]}</span>
                <Menu className="h-4 w-4 text-slate-500" />
              </summary>
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                <div className="flex items-center gap-3 border-b border-slate-100 p-3">
                  <Avatar name={user.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs font-medium text-blue-700">{ROLE_LABEL[user.role]}</p>
                  </div>
                </div>

                <nav aria-label="Main navigation" className="py-2 flex flex-col gap-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50/80 hover:text-blue-900"
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <Link
                    href="/about"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-blue-900 bg-blue-50/60 transition hover:bg-blue-100 mt-1"
                  >
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span>About ProSolution & Strategy</span>
                  </Link>
                </nav>

                <form action={logoutAction} className="border-t border-slate-100 pt-2">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</main>

      {/* Mobile Bottom Navigation Bar for quick access */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md sm:hidden"
      >
        {items.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 rounded-xl py-1 text-slate-600 hover:text-blue-700 transition"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold leading-none">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 pb-12 pt-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          ProSolution · Mobile-First Local Services Marketplace
        </p>
        <p className="mt-1">
          <Link
            href="/about"
            className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2"
          >
            <span>Explore About ProSolution & Strategic Blueprint</span>
            <span aria-hidden="true">→</span>
          </Link>
        </p>
        <p className="mt-1 text-slate-400">
          Academic prototype. Verification confirms document submission review, not legal certification.
        </p>
      </footer>
    </div>
  );
}
