import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth';

// Server-side role guard for every /admin page. Hiding links in the UI is not enough on its own.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole('admin');
  return <>{children}</>;
}
