"use client";

const EXAMPLE_QUERIES = [
  "water tap is leaking in kitchen",
  "AC is making noise",
  "need someone for CCTV installation",
  "gas stove is not lighting",
];

export function SearchBar({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
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

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Try:</span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onChange(example)}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-brand-600 dark:hover:text-brand-400"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
