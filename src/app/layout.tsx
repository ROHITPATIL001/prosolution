import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ProSolution', template: '%s · ProSolution' },
  description: 'Find local service providers, compare transparent quotations and book with confidence.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1d4ed8',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen overflow-x-hidden bg-blue-50/40 text-slate-900 antialiased">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
