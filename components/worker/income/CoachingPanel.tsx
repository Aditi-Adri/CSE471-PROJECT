import type { CoachingRecordData } from "./types";

function formatPeriodLabel(record: CoachingRecordData): string {
  const date = new Date(record.periodStart);
  if (record.range === "WEEK") {
    return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (record.range === "MONTH") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return date.getFullYear().toString();
}

export function CoachingPanel({
  current,
  noData,
  history,
  loading,
}: {
  current: { suggestionText: string | null; demandForecastText: string | null; source: string } | null;
  noData: boolean;
  history: CoachingRecordData[];
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/30">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {current?.source === "AI" ? "AI insight" : "Estimate"}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Business suggestion</span>
        </div>
        {loading ? (
          <div className="h-4 w-3/4 animate-pulse rounded bg-brand-200/60 dark:bg-brand-900/40" />
        ) : noData ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Complete a few jobs this period to unlock a personalized suggestion.
          </p>
        ) : (
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{current?.suggestionText}</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Upcoming local demand
          </span>
        </div>
        {loading ? (
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        ) : noData ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-600">Not enough recent history yet for a demand estimate.</p>
        ) : (
          <>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{current?.demandForecastText}</p>
            <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-600">
              Generated advice/prediction, not guaranteed demand data.
            </p>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Coaching history</p>
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {history.map((record) => (
              <div key={record.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{formatPeriodLabel(record)}</p>
                {record.suggestionText && (
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                    <span className="font-medium">Suggestion: </span>
                    {record.suggestionText}
                  </p>
                )}
                {record.demandForecastText && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">Demand: </span>
                    {record.demandForecastText}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
