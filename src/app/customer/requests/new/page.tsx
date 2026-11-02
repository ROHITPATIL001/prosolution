import type { Metadata } from 'next';
import { createRequestAction } from '@/app/actions/customer';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, Flash, PageHeader } from '@/components/ui';
import { maxUploadBytes } from '@/lib/storage';
import { RequestWizard } from '@/components/request-wizard';

export const metadata: Metadata = { title: 'Post a New Request' };

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole('customer');
  const params = await searchParams;
  const categories = await query<{ id: string; name: string }>(
    `SELECT id, name FROM service_categories WHERE is_active ORDER BY name`,
  );
  const maxMb = Math.round(maxUploadBytes() / (1024 * 1024));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Post a service request"
        subtitle="Follow the steps below to describe your job. Verified providers will review your details and send transparent FairQuotes."
        backHref="/customer/requests"
        backLabel="Back to requests"
      />

      <Card className="p-6 sm:p-8">
        <Flash error={params.error} />
        <form action={createRequestAction} encType="multipart/form-data">
          <RequestWizard categories={categories} maxUploadMb={maxMb} />
        </form>
      </Card>
    </div>
  );
}
