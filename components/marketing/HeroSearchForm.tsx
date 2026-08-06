"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearchForm() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg shadow-zinc-900/5 sm:flex-row dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20"
    >
      <label htmlFor="hero-search" className="sr-only">
        Describe your problem
      </label>
      <input
        id="hero-search"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='e.g. "water tap is leaking in kitchen"'
        className="w-full flex-1 rounded-xl bg-transparent px-4 py-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
      <button
        type="submit"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <SearchIcon />
        Search
      </button>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
