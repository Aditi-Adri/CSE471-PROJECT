export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <span aria-hidden="true" className="text-3xl">
        🔍
      </span>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-300 bg-red-50/50 px-6 py-16 text-center dark:border-red-900 dark:bg-red-950/20">
      <span aria-hidden="true" className="text-3xl">
        ⚠️
      </span>
      <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        Try again
      </button>
    </div>
  );
}
