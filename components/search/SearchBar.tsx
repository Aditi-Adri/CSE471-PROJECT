"use client";

const EXAMPLE_QUERIES = [
  { icon: "💧", text: "water tap is leaking in kitchen" },
  { icon: "❄️", text: "AC is making noise" },
  { icon: "📹", text: "need someone for CCTV installation" },
  { icon: "🔥", text: "gas stove is not lighting" },
];

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onQuickSearch,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onQuickSearch: (text: string) => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm sm:flex-row dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label htmlFor="search-query" className="sr-only">
          Describe your problem
        </label>
        <input
          id="search-query"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Describe the problem — e.g. "water tap is leaking in kitchen"'
          className="w-full flex-1 rounded-xl bg-transparent px-3 py-2.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-base font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching…" : "Find a technician"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Popular searches:
        </span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example.text}
            type="button"
            onClick={() => onQuickSearch(example.text)}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
          >
            <span aria-hidden="true">{example.icon}</span>
            {example.text}
          </button>
        ))}
      </div>
    </div>
  );
}
