import { formatBdt } from "@/lib/format";
import type { TimeSeriesPoint } from "./types";

/**
 * Plain SVG bar chart — the project has no chart library installed (see
 * package.json), so this avoids adding a new dependency for one chart.
 * Same approach as EarningsByCategoryChart/PeakHoursChart.
 */
export function EarningsOverTimeChart({ points }: { points: TimeSeriesPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.earningsBdt));
  const showEveryLabel = points.length <= 12;
  const width = 100 * points.length;
  const height = 160;
  const barGap = 2;
  const barWidth = 100 - barGap;

  const hasData = points.some((p) => p.earningsBdt > 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Earnings over time</p>
      {!hasData ? (
        <EmptyChartState />
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height + 24}`}
            preserveAspectRatio="none"
            className="h-40 w-full min-w-full"
            role="img"
            aria-label="Earnings over time"
          >
            {points.map((point, i) => {
              const barHeight = max > 0 ? (point.earningsBdt / max) * height : 0;
              const x = i * 100;
              return (
                <g key={`${point.label}-${i}`}>
                  <title>{`${point.label}: ${formatBdt(point.earningsBdt)}`}</title>
                  <rect
                    x={x}
                    y={height - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx={3}
                    className={point.earningsBdt > 0 ? "fill-brand-500 dark:fill-brand-400" : "fill-zinc-100 dark:fill-zinc-800"}
                  />
                  {(showEveryLabel || i % Math.ceil(points.length / 8) === 0) && (
                    <text
                      x={x + barWidth / 2}
                      y={height + 16}
                      textAnchor="middle"
                      className="fill-zinc-400 text-[9px] dark:fill-zinc-500"
                    >
                      {point.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

export function EmptyChartState() {
  return (
    <div className="flex h-32 items-center justify-center rounded-xl bg-zinc-50 text-sm text-zinc-400 dark:bg-zinc-950 dark:text-zinc-600">
      No completed jobs for this period.
    </div>
  );
}
