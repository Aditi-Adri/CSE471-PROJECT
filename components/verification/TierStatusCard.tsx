const STATUS_STYLES = {
  PENDING: {
    label: "Pending review",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  },
} as const;

export function TierStatusCard({
  title,
  status,
  note,
  extra,
}: {
  title: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note?: string | null;
  extra?: string;
}) {
  const style = STATUS_STYLES[status];
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}>
          {style.label}
        </span>
      </div>
      {extra && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{extra}</p>}
      {note && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Coordinator note: {note}</p>}
    </div>
  );
}
