"use client";

const RANGES: { value: "week" | "month" | "year"; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function RangeSelector({
  value,
  onChange,
}: {
  value: "week" | "month" | "year";
  onChange: (range: "week" | "month" | "year") => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          aria-pressed={value === r.value}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            value === r.value
              ? "bg-white text-brand-700 shadow-sm dark:bg-zinc-800 dark:text-brand-300"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
