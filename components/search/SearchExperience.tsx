"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "./SearchBar";
import { FilterPanel } from "./FilterPanel";
import { WorkerCard } from "./WorkerCard";
import { WorkerMapView } from "./WorkerMapView";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { EmptyState, ErrorState } from "./EmptyState";
import { DetectedCategoryBanner } from "./DetectedCategoryBanner";
import { PostRequestForm } from "@/components/jobRequests/PostRequestForm";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { buildSearchUrl } from "@/lib/search/buildSearchUrl";
import type { SortOption } from "@/lib/validation/searchSchema";
import { EMPTY_FILTERS, type CategoryOption, type SearchApiResponse, type SearchFiltersState } from "@/lib/types/search";

// The main search page: search box, filters, and results. Reads its
// starting query/category from the URL, so links like "/search?q=..."
// land already filled in instead of starting blank.
export function SearchExperience() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategoryId = searchParams.get("categoryId");

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFiltersState>({
    ...EMPTY_FILTERS,
    categoryId: initialCategoryId,
  });
  const [sort, setSort] = useState<SortOption>("RELEVANCE");
  const [page, setPage] = useState(1);
  const [retryNonce, setRetryNonce] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showPostForm, setShowPostForm] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [response, setResponse] = useState<SearchApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remembers which request the current response/error actually came
  // from, so we can tell "still loading" apart from "already done"
  // just by comparing keys, instead of a separate loading flag.
  const [lastHandledKey, setLastHandledKey] = useState<string | null>(null);

  const debouncedFilters = useDebouncedValue(filters, 400);

  // Load the category list once, for the "manual override" filter dropdown.
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories: CategoryOption[] }) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  const requestUrl = useMemo(
    () => buildSearchUrl({ query: submittedQuery, filters: debouncedFilters, sort, page }),
    [submittedQuery, debouncedFilters, sort, page]
  );
  const attemptKey = `${requestUrl}#${retryNonce}`;
  const loading = attemptKey !== lastHandledKey;

  // Runs on every search/filter/page change, mount included — there's
  // always something to fetch, since "no query" still shows everyone.
  useEffect(() => {
    const controller = new AbortController();

    fetch(requestUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        return (await res.json()) as SearchApiResponse;
      })
      .then((data) => {
        setResponse(data);
        setError(null);
        setLastHandledKey(attemptKey);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLastHandledKey(attemptKey);
      });

    return () => controller.abort();
  }, [attemptKey, requestUrl]);

  function handleSubmitSearch() {
    setSubmittedQuery(queryInput);
    setPage(1);
    setShowPostForm(false);
  }

  function handleQuickSearch(text: string) {
    setQueryInput(text);
    setSubmittedQuery(text);
    setPage(1);
    setShowPostForm(false);
  }

  function handleFiltersChange(next: SearchFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function handleSortChange(next: SortOption) {
    setSort(next);
    setPage(1);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Find a verified local technician
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Browse every verified technician below, or describe the problem in your own
          words and we&apos;ll match and re-sort the list instantly.
        </p>
      </header>

      <SearchBar
        value={queryInput}
        onChange={setQueryInput}
        onSubmit={handleSubmitSearch}
        onQuickSearch={handleQuickSearch}
        loading={loading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <FilterPanel
          filters={filters}
          onChange={handleFiltersChange}
          categories={categories}
          sort={sort}
          onSortChange={handleSortChange}
        />

        <div className="flex flex-col gap-4">
          {response?.detectedCategory && (
            <DetectedCategoryBanner
              category={response.detectedCategory}
              method={response.matchMethod}
              confidence={response.matchConfidence}
            />
          )}

          {/* Customer typed something, but it didn't match any service
              category — say so, and offer to post it as a request instead. */}
          {!loading && !error && response && !response.detectedCategory && submittedQuery.trim().length >= 2 && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                We don&apos;t have &ldquo;{submittedQuery}&rdquo; as a service yet.
              </p>
              {showPostForm ? (
                <PostRequestForm initialDescription={submittedQuery} />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPostForm(true)}
                  className="self-start text-sm font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  Can&apos;t find it? Post what you need and a technician can respond →
                </button>
              )}
            </div>
          )}

          {loading && <ResultsSkeleton />}

          {error && !loading && (
            <ErrorState message={error} onRetry={() => setRetryNonce((n) => n + 1)} />
          )}

          {!loading && !error && response && (
            <>
              <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span>
                  {response.total} {response.total === 1 ? "technician" : "technicians"} found
                  {response.matchMethod === "NONE" && " · sorted by trust & rating"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline">Search took {response.durationMs}ms</span>
                  <div className="flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
                    {(["list", "map"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                          viewMode === mode
                            ? "bg-brand-600 text-white"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {response.results.length === 0 ? (
                <EmptyState message="No technicians match those filters yet. Try widening your budget or removing a filter." />
              ) : viewMode === "map" ? (
                <WorkerMapView workers={response.results} />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {response.results.map((worker) => (
                    <WorkerCard key={worker.id} worker={worker} />
                  ))}
                </div>
              )}

              {response.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:text-inherit dark:border-zinc-700 dark:hover:border-brand-600 dark:hover:text-brand-400 dark:disabled:hover:border-zinc-700"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Page {response.page} of {response.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= response.totalPages}
                    onClick={() => setPage((p) => Math.min(response.totalPages, p + 1))}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:text-inherit dark:border-zinc-700 dark:hover:border-brand-600 dark:hover:text-brand-400 dark:disabled:hover:border-zinc-700"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
