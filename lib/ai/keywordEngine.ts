/**
 * Free, zero-cost, always-available category classifier.
 *
 * This is the PRIMARY classification path for Smart Search (see
 * categoryMapper.ts) — it costs nothing, needs no network call, and
 * never fails, so a demo/viva never depends on a third-party API being
 * reachable. The optional AI path in geminiClient.ts only kicks in when
 * a free Gemini API key is explicitly configured.
 *
 * Algorithm: normalize the query, then score each category by how many
 * of its keyword phrases appear in the text. Multi-word phrases (e.g.
 * "water tap") count for more than single words (e.g. "leak") because
 * they're far less likely to match by coincidence.
 */

export type CategoryForMatching = {
  id: string;
  name: string;
  keywords: readonly string[];
};

export type KeywordMatch = {
  categoryId: string;
  categoryName: string;
  score: number;
  matchedKeywords: string[];
};

export type KeywordClassification = {
  best: KeywordMatch | null;
  ranked: KeywordMatch[];
  confidence: number; // 0..1
};

export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s/]/gu, " ") // strip punctuation, keep "a/c"-style slashes
    .replace(/\s+/g, " ")
    .trim();
}

function keywordWeight(keyword: string): number {
  // Multi-word phrases are much more specific than single words, so they
  // should dominate the score when present.
  const wordCount = keyword.trim().split(/\s+/).length;
  return wordCount >= 2 ? 3 : 1;
}

export function classifyWithKeywords(
  rawQuery: string,
  categories: readonly CategoryForMatching[]
): KeywordClassification {
  const normalized = normalizeQuery(rawQuery);

  if (!normalized) {
    return { best: null, ranked: [], confidence: 0 };
  }

  const paddedQuery = ` ${normalized} `;

  const ranked: KeywordMatch[] = categories
    .map((category) => {
      let score = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of category.keywords) {
        const normalizedKeyword = normalizeQuery(keyword);
        if (!normalizedKeyword) continue;

        // Substring match against a space-padded query so keywords only
        // match on word boundaries — e.g. "tap" won't match inside an
        // unrelated word like "adaptation". The leading/trailing padding
        // on paddedQuery also makes boundary matches work at the very
        // start/end of the query without special-casing them.
        if (paddedQuery.includes(` ${normalizedKeyword} `)) {
          score += keywordWeight(normalizedKeyword);
          matchedKeywords.push(keyword);
        }
      }

      return {
        categoryId: category.id,
        categoryName: category.name,
        score,
        matchedKeywords,
      };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return { best: null, ranked: [], confidence: 0 };
  }

  const best = ranked[0];
  const runnerUpScore = ranked[1]?.score ?? 0;
  // Confidence rewards both an absolute strong match and a clear margin
  // over the second-best category, capped at 0.97 (never claim certainty
  // — this is a heuristic, not a model prediction).
  const absoluteStrength = Math.min(best.score / 4, 1);
  const margin = runnerUpScore === 0 ? 1 : Math.min((best.score - runnerUpScore) / best.score, 1);
  const confidence = Math.round(Math.min(0.4 + absoluteStrength * 0.4 + margin * 0.2, 0.97) * 100) / 100;

  return { best, ranked, confidence };
}
