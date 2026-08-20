import { classifyWithKeywords, type CategoryForMatching } from "./keywordEngine";
import { classifyWithGroq } from "./groqClient";

export type CategoryMapResult = {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  method: "AI" | "KEYWORD";
};

// Maps free text ("water tap is leaking in kitchen") to a known
// ServiceCategory. Tries the free Groq AI first if a key is set; if
// that fails or isn't configured, falls back to the local keyword
// engine — so search always works, with or without an API key.
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
