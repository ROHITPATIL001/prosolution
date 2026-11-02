import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth';

// Server-side role guard for every /customer page. Visitors and other roles are redirected.
export default async function CustomerLayout({ children }: { children: ReactNode }) {
  await requireRole('customer');
  return <>{children}</>;
}
