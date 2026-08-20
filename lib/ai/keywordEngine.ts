// A free, always-available category matcher: no API key or network
// call needed, so search still works even with no Groq key set.
// How it works: normalize the query text, then score each category by
// how many of its keyword phrases appear in it. A multi-word phrase
// (like "water tap") counts for more than a single word (like "leak"),
// since it's much less likely to match by coincidence.

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

// A multi-word keyword (like "water tap") counts for more than a
// single word (like "leak"), since it's more specific.
function keywordWeight(keyword: string): number {
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

  // Pad with spaces so a keyword only matches on word boundaries —
  // e.g. "tap" won't match inside an unrelated word like "adaptation".
  const paddedQuery = ` ${normalized} `;

  // Score every category by how many of its keywords appear in the query.
  const matches: KeywordMatch[] = [];
  for (const category of categories) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of category.keywords) {
      const normalizedKeyword = normalizeQuery(keyword);
      if (!normalizedKeyword) continue;

      if (paddedQuery.includes(` ${normalizedKeyword} `)) {
        score += keywordWeight(normalizedKeyword);
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0) {
      matches.push({ categoryId: category.id, categoryName: category.name, score, matchedKeywords });
    }
  }

  // Highest score first.
  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return { best: null, ranked: [], confidence: 0 };
  }

  const best = matches[0];
  const runnerUpScore = matches[1]?.score ?? 0;

  // Confidence is higher when the best match is strong on its own, and
  // higher again when it clearly beats the second-best category.
  // Capped at 0.97 since this is a heuristic, not a real prediction.
  const absoluteStrength = Math.min(best.score / 4, 1);
  const margin = runnerUpScore === 0 ? 1 : Math.min((best.score - runnerUpScore) / best.score, 1);
  const confidence = Math.round(Math.min(0.4 + absoluteStrength * 0.4 + margin * 0.2, 0.97) * 100) / 100;

  return { best, ranked: matches, confidence };
}
