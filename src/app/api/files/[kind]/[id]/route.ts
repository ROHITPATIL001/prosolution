import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/errors';
import { readStoredFile } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FileRow = {
  storage_key: string;
  original_name: string;
  file_type: string;
  owner_id: string;
  is_public_to_members: boolean;
  is_linked_to_user: boolean;
};

/**
 * Serves stored files only after an authorisation check (FR-25, Sections 9 and 15).
 * Private documents are never reachable by a public URL.
 *
 *  - provider-document:  the provider who uploaded it, or an administrator
 *  - work-photo:         any signed-in member, but only photos of approved providers (WorkProof)
 *  - request-attachment: the customer who posted it, an administrator, or a provider who quoted on it
 */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Please sign in to view this file.', { status: 401 });
  if (!isUuid(id)) return new Response('Not found', { status: 404 });

  let row: FileRow | undefined;

  if (kind === 'provider-document') {
    [row] = await query<FileRow>(
      `SELECT storage_key, original_name, file_type,
              provider_id AS owner_id, false AS is_public_to_members, false AS is_linked_to_user
         FROM provider_documents WHERE id = $1`,
      [id],
    );
    if (row && user.role !== 'admin' && user.id !== row.owner_id) return new Response('Forbidden', { status: 403 });
  } else if (kind === 'work-photo') {
    [row] = await query<FileRow>(
      `SELECT w.storage_key, w.original_name, w.file_type, w.provider_id AS owner_id,
              (p.verification_status = 'approved') AS is_public_to_members, false AS is_linked_to_user
         FROM work_photos w JOIN provider_profiles p ON p.user_id = w.provider_id
        WHERE w.id = $1`,
      [id],
    );
    if (row && !row.is_public_to_members && user.role !== 'admin' && user.id !== row.owner_id) {
      return new Response('Forbidden', { status: 403 });
    }
  } else if (kind === 'request-attachment') {
    [row] = await query<FileRow>(
      `SELECT a.storage_key, a.original_name, a.file_type, r.customer_id AS owner_id,
              false AS is_public_to_members,
              EXISTS (SELECT 1 FROM quotations q WHERE q.request_id = r.id AND q.provider_id = $2) AS is_linked_to_user
         FROM request_attachments a JOIN service_requests r ON r.id = a.request_id
        WHERE a.id = $1`,
      [id, user.id],
    );
    if (row && user.role !== 'admin' && user.id !== row.owner_id && !row.is_linked_to_user) {
      return new Response('Forbidden', { status: 403 });
    }
  } else {
    return new Response('Not found', { status: 404 });
  }

  if (!row) return new Response('Not found', { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readStoredFile(row.storage_key);
  } catch {
    return new Response('This file is no longer available.', { status: 404 });
  }

  const safeName = row.original_name.replace(/[^\w.\- ]+/g, '_');
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': row.file_type,
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}
