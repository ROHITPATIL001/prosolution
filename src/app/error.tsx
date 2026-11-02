'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { buttonClass, secondaryButtonClass } from '@/components/styles';

// Friendly error screen with retry guidance (FR-26). Detailed errors stay in the server logs.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        Anything you had already saved is safe. Please try again. If the problem continues, check your connection and come back shortly.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={() => reset()} className={buttonClass}>Try again</button>
        <Link href="/" className={secondaryButtonClass}>Go to home</Link>
      </div>
    </div>
  );
}
