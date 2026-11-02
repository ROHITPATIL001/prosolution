import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth';

// Server-side role guard for every /provider page.
export default async function ProviderLayout({ children }: { children: ReactNode }) {
  await requireRole('provider');
  return <>{children}</>;
}
