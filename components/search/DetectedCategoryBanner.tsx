import type { DetectedCategory, SearchApiResponse } from "@/lib/types/search";

const METHOD_LABEL: Record<SearchApiResponse["matchMethod"], string> = {
  AI: "Groq AI",
  KEYWORD: "keyword engine",
  MANUAL_FILTER: "manual filter",
  NONE: "no filter",
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
    <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300">
      <span aria-hidden="true" className="text-base">
        {category.icon}
      </span>
      <span>
        Matched to <strong className="font-semibold">{category.name}</strong>
        {confidence !== null && (
          <span className="text-brand-600/80 dark:text-brand-400/80">
            {" "}
            · {Math.round(confidence * 100)}% confidence via {METHOD_LABEL[method]}
          </span>
        )}
      </span>
    </div>
  );
}
