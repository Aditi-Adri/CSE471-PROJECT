import { classifyWithKeywords, type CategoryForMatching } from "./keywordEngine";
import { classifyWithGroq } from "./groqClient";

export type CategoryMapResult = {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  method: "AI" | "KEYWORD";
};

/**
 * Maps free-text customer input ("water tap is leaking in kitchen") to a
 * known ServiceCategory.
 *
 * Two-tier strategy:
 *   1. If GROQ_API_KEY is configured, try the free Groq API first.
 *   2. Otherwise — or if that call fails/times out/is inconclusive —
 *      fall back to the local keyword engine, which is free, instant,
 *      and has no external dependency at all.
 *
 * This keeps the feature fully functional (and fast) out of the box with
 * zero configuration, while still satisfying the "send it to an AI API"
 * requirement once a teammate drops in a free key.
 */
export async function mapQueryToCategory(
  query: string,
  categories: readonly CategoryForMatching[]
): Promise<CategoryMapResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (apiKey) {
    const aiResult = await classifyWithGroq(query, categories, { apiKey });
    if (aiResult) {
      const category = categories.find((c) => c.id === aiResult.categoryId);
      if (category) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          confidence: aiResult.confidence,
          method: "AI",
        };
      }
    }
    // Falls through to the keyword engine on any AI failure.
  }

  const keywordResult = classifyWithKeywords(query, categories);
  if (!keywordResult.best) {
    return { categoryId: null, categoryName: null, confidence: 0, method: "KEYWORD" };
  }

  return {
    categoryId: keywordResult.best.categoryId,
    categoryName: keywordResult.best.categoryName,
    confidence: keywordResult.confidence,
    method: "KEYWORD",
  };
}
