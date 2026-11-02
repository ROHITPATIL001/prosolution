// Shown while a page is loading (FR-26 loading states).
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-blue-900">
      <span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
      <p className="text-sm font-medium">Loading…</p>
    </div>
  );
}
