import type { DetectedCategory, SearchApiResponse } from "@/lib/types/search";

const METHOD_LABEL: Record<SearchApiResponse["matchMethod"], string> = {
  AI: "Gemini AI",
  KEYWORD: "keyword engine",
  MANUAL_FILTER: "manual filter",
};

export function DetectedCategoryBanner({
  category,
  method,
  confidence,
}: {
  category: DetectedCategory;
  method: SearchApiResponse["matchMethod"];
  confidence: number | null;
}) {
  if (!category) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      <span aria-hidden="true" className="text-base">
        {category.icon}
      </span>
      <span>
        Matched to <strong className="font-semibold">{category.name}</strong>
        {confidence !== null && (
          <span className="text-zinc-500 dark:text-zinc-400">
            {" "}
            · {Math.round(confidence * 100)}% confidence via {METHOD_LABEL[method]}
          </span>
        )}
      </span>
    </div>
  );
}
