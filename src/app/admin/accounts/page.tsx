import type { Metadata } from 'next';
import { setAccountStatusAction } from '@/app/actions/admin';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { Card, EmptyState, Field, Flash, PageHeader, Pager, StatusBadge } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { inputClass, secondaryButtonClass } from '@/components/styles';
import { formatDate } from '@/lib/format';
import { PAGE_SIZE, parsePage } from '@/lib/rules';

export const metadata: Metadata = { title: 'Accounts' };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; q?: string; role?: string; page?: string }>;
}) {
  const admin = await requireRole('admin');
  const params = await searchParams;
  const page = parsePage(params.page);
  const search = params.q?.trim() ? `%${params.q.trim().toLowerCase()}%` : null;
  const role = ['customer', 'provider', 'admin'].includes(params.role ?? '') ? params.role! : null;

  const rows = await query<{ id: string; name: string; email: string; role: string; account_status: string; created_at: Date }>(
    `SELECT id, name, email, role, account_status, created_at FROM users
      WHERE ($1::text IS NULL OR lower(name) LIKE $1 OR email LIKE $1)
        AND ($2::text IS NULL OR role = $2)
      ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [search, role, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE],
  );
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  const filterParams: Record<string, string> = {};
  if (params.q) filterParams.q = params.q;
  if (role) filterParams.role = role;

  return (
    <>
      <PageHeader title="Accounts" subtitle="Find customers and providers. Suspended accounts cannot sign in. Every change is logged." />
      <Flash ok={params.ok} error={params.error} />

      <Card className="mb-6">
        <form method="get" className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <Field label="Search by name or email" htmlFor="q">
            <input id="q" name="q" type="search" defaultValue={params.q ?? ''} className={inputClass} />
          </Field>
          <Field label="Role" htmlFor="role">
            <select id="role" name="role" defaultValue={role ?? ''} className={inputClass}>
              <option value="">All roles</option>
              <option value="customer">Customers</option>
              <option value="provider">Providers</option>
              <option value="admin">Admins</option>
            </select>
          </Field>
          <button type="submit" className={secondaryButtonClass}>Search</button>
        </form>
      </Card>

      {visible.length === 0 ? (
        <EmptyState title="No accounts match" />
      ) : (
        <ul className="space-y-3">
          {visible.map((u) => {
            const suspended = u.account_status === 'suspended';
            const isSelf = u.id === admin.id;
            return (
              <li key={u.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{u.name}</h2>
                      <StatusBadge label={u.role} tone="slate" />
                      {suspended ? <StatusBadge label="Suspended" tone="red" /> : null}
                    </div>
                    <p className="truncate text-sm text-slate-600">{u.email}</p>
                    <p className="text-xs text-slate-500">Joined {formatDate(u.created_at)}</p>
                  </div>
                  {isSelf || u.role === 'admin' ? (
                    <p className="text-sm text-slate-500">{isSelf ? 'This is your account' : 'Admin accounts are managed separately'}</p>
                  ) : (
                    <form action={setAccountStatusAction}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="status" value={suspended ? 'active' : 'suspended'} />
                      <SubmitButton variant={suspended ? 'secondary' : 'danger'} pendingLabel="Saving…" className="w-full sm:w-auto">
                        {suspended ? 'Reactivate account' : 'Suspend account'}
                      </SubmitButton>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Pager basePath="/admin/accounts" page={page} hasNext={hasNext} params={filterParams} />
      <p className="mt-6 text-xs text-slate-500">
        Suspending an account blocks sign-in and takes effect on that user&apos;s next page load.
      </p>
    </>
  );
}
