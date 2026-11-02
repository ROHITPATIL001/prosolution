import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { checkUpload, detectMime } from './rules';

/**
 * File storage adapter.
 *
 * Development: files are written to STORAGE_DIR on the local disk (gitignored).
 * Production: replace the body of these two functions with a cloud object store
 * (for example S3-compatible storage or Vercel Blob with private access). Keep the
 * same contract: keys are generated here, bytes never leave the server without an
 * authorisation check, and Neon stores only the metadata and key.
 */

const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? './storage');
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export type StoredFile = {
  storageKey: string;
  originalName: string;
  fileType: string;
  sizeBytes: number;
};

export function maxUploadBytes(): number {
  return MAX_BYTES;
}

/**
 * Validates an uploaded file (declared type, size, and real content signature) and
 * saves it under a random key. Throws an Error with a user-friendly message on failure.
 */
export async function saveUpload(file: File, kind: 'photo' | 'document', folder: string): Promise<StoredFile> {
  const sizeProblem = checkUpload(kind, file.type, file.size, MAX_BYTES);
  if (sizeProblem) throw new Error(sizeProblem);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const actualType = detectMime(bytes);
  if (!actualType || actualType !== file.type) {
    throw new Error('The file contents do not match its type. Please upload a genuine JPG, PNG, WebP or PDF.');
  }

  const extension = EXTENSION_BY_TYPE[actualType];
  const storageKey = `${folder}/${randomUUID()}.${extension}`;
  const absolutePath = path.join(STORAGE_ROOT, storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  return {
    storageKey,
    originalName: sanitizeName(file.name),
    fileType: actualType,
    sizeBytes: bytes.byteLength,
  };
}

/** Reads a stored file. Keys come only from saveUpload, but traversal is rejected anyway. */
export async function readStoredFile(storageKey: string): Promise<Buffer> {
  if (storageKey.includes('..') || path.isAbsolute(storageKey)) {
    throw new Error('Invalid storage key');
  }
  return readFile(path.join(STORAGE_ROOT, storageKey));
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^\w.\- ]+/g, '_').trim();
  return (cleaned || 'upload').slice(0, 120);
}
