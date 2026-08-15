export function ResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-3">
            <div className="h-13 w-13 rounded-full bg-zinc-200 dark:bg-zinc-800" style={{ height: 52, width: 52 }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="mt-4 h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="mt-4 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}
