"use client";

import { DHAKA_AREAS, VERIFICATION_TIERS } from "@/lib/constants/dhakaAreas";
import { sortOptions, type SortOption } from "@/lib/validation/searchSchema";
import type { DhakaArea, VerificationTier } from "@/app/generated/prisma/client";
import type { CategoryOption, SearchFiltersState } from "@/lib/types/search";

const SORT_LABELS: Record<SortOption, string> = {
  RELEVANCE: "Most relevant",
  RATING: "Highest rated",
  PRICE_LOW: "Price: low to high",
  PRICE_HIGH: "Price: high to low",
  EXPERIENCE: "Most experienced",
};

export function FilterPanel({
  filters,
  onChange,
  categories,
  sort,
  onSortChange,
}: {
  filters: SearchFiltersState;
  onChange: (next: SearchFiltersState) => void;
  categories: CategoryOption[];
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}) {
  return (
    <aside className="flex h-fit flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-24 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Filters</h2>
      </div>

      <FilterField label="Category">
        <select
          value={filters.categoryId ?? ""}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value || null })}
          className={selectClass}
        >
          <option value="">Auto-detect from description</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Neighborhood">
        <select
          value={filters.area ?? ""}
          onChange={(e) =>
            onChange({ ...filters, area: (e.target.value || null) as DhakaArea | null })
          }
          className={selectClass}
        >
          <option value="">Any area</option>
          {DHAKA_AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Budget (৳/hr)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            value={filters.minBudget ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                minBudget: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={`${selectClass} w-full`}
          />
          <span className="text-zinc-400">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            value={filters.maxBudget ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                maxBudget: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={`${selectClass} w-full`}
          />
        </div>
      </FilterField>

      <FilterField label="Minimum verification tier">
        <select
          value={filters.minTier ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              minTier: (e.target.value || null) as VerificationTier | null,
            })
          }
          className={selectClass}
        >
          <option value="">Any tier</option>
          {/* "Unverified" is rank 0 — as a *minimum* tier it would match
              every worker (everyone is at least unverified), which is
              functionally identical to "Any tier" but looks broken:
              picking it and seeing Tier 3 workers appear reads as a bug.
              Excluding it here removes that trap; the real "Any tier"
              option above already covers the same case correctly. */}
          {VERIFICATION_TIERS.filter((t) => t.value !== "UNVERIFIED").map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </FilterField>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={filters.availableNow}
          onChange={(e) => onChange({ ...filters, availableNow: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-600 dark:border-zinc-600 dark:bg-zinc-800"
        />
        Available right now
      </label>

      <FilterField label="Sort by">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className={selectClass}
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </FilterField>
    </aside>
  );
}

const selectClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-brand-500 dark:focus:ring-brand-500";

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
