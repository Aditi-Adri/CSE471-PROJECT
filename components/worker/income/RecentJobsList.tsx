import { formatBdt } from "@/lib/format";
import type { RecentJob } from "./types";

export function RecentJobsList({ jobs }: { jobs: RecentJob[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent completed jobs</p>
      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-600">No completed jobs for this period.</p>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{job.jobType}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {job.categoryLabel} ·{" "}
                  {new Date(job.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{formatBdt(job.amountBdt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
