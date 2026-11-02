import Link from 'next/link';
import { buttonClass } from '@/components/styles';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you were looking for does not exist or you do not have access to it.</p>
      <Link href="/" className={`${buttonClass} mt-6`}>Back to ProSolution</Link>
    </div>
  );
}
