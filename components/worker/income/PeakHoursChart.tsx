import { formatBdt } from "@/lib/format";
import { EmptyChartState } from "./EarningsOverTimeChart";
import type { HourBucket } from "./types";

export function PeakHoursChart({ hours, peakHour }: { hours: HourBucket[]; peakHour: HourBucket | null }) {
  const max = Math.max(1, ...hours.map((h) => h.earningsBdt));
  const height = 140;
  const width = Math.max(100, 100 * hours.length);
  const barGap = 6;
  const barWidth = 100 - barGap;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Peak earning hours</p>
      {peakHour && (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Your peak earning period is <span className="font-medium text-brand-700 dark:text-brand-300">{peakHour.label}</span>.
        </p>
      )}
      {hours.length === 0 ? (
        <EmptyChartState />
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height + 22}`}
            preserveAspectRatio="none"
            className="h-36 w-full min-w-full"
            role="img"
            aria-label="Peak earning hours"
          >
            {hours.map((hour, i) => {
              const barHeight = (hour.earningsBdt / max) * height;
              const x = i * 100;
              const isPeak = peakHour?.hour === hour.hour;
              return (
                <g key={hour.hour}>
                  <title>{`${hour.label}: ${formatBdt(hour.earningsBdt)}`}</title>
                  <rect
                    x={x}
                    y={height - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx={3}
                    className={isPeak ? "fill-amber-500 dark:fill-amber-400" : "fill-brand-300 dark:fill-brand-700"}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={height + 15}
                    textAnchor="middle"
                    className="fill-zinc-400 text-[8px] dark:fill-zinc-500"
                  >
                    {hour.hour}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
