/**
 * MODULE 2 -> FEATURE 1 (Shiva): Review Fraud Detection — free local
 * fallback heuristic.
 *
 * Pure text/rating scoring, no DB or network access — same reason
 * lib/ai/keywordEngine.ts is the free fallback behind
 * lib/ai/categoryMapper.ts's Groq call: this project runs with zero
 * paid keys out of the box, so every AI-shaped feature needs a real,
 * always-available path that isn't "throw an error". See
 * fraudDetector.ts for where this plugs in alongside the Groq path,
 * and groqFraudCheck.ts for that side.
 *
 * Not a security boundary — a determined bad actor can write around
 * any of these signals. It's a best-effort, zero-cost triage layer
 * that catches the common, low-effort cases (bot-generated spam,
 * copy-pasted filler, a rating that flatly contradicts the text) so a
 * human (the admin queue at app/admin/reviews) spends their attention
 * on the reviews actually worth a second look.
 */

const NEGATIVE_WORDS = [
  "worst", "terrible", "awful", "horrible", "scam", "fraud", "rude",
  "late", "broke", "broken", "damaged", "unprofessional", "refused",
  "disaster", "never again", "waste of money", "disgusting", "useless",
  "cheated", "overcharged", "ignored", "cancelled last minute",
];

const POSITIVE_WORDS = [
  "great", "excellent", "amazing", "perfect", "best", "wonderful",
  "fantastic", "professional", "punctual", "recommend", "awesome",
  "superb", "outstanding", "fabulous", "brilliant", "flawless",
];

// Ultra-generic filler that carries no actual information about the
// job — the kind of text a bot or a rushed fraudster drops in to
// clear a "leave a comment" field.
const GENERIC_PHRASES = new Set([
  "good", "ok", "okay", "fine", "nice", "good service", "nice work",
  "very good", "good job", "great work", "very nice", "well done",
  "5 stars", "five stars", "as expected", "no comment", "n/a",
]);

export type HeuristicResult = {
  /** 0..1, higher = more likely fake. */
  score: number;
  reasons: string[];
};

/** Lowercases and collapses repeated spaces so matching is consistent. */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Escapes regex characters so a word like "n/a" can't break the pattern. */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary match, not plain substring — `text.includes("professional")`
 * would also match inside "unprofessional", which is exactly backwards
 * (that's a negative signal, not a positive one).
 */
function countMatches(text: string, words: readonly string[]): number {
  return words.reduce((count, word) => {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    return pattern.test(text) ? count + 1 : count;
  }, 0);
}

/** Same character (not whitespace) repeated 5+ times in a row, e.g. "sooooo good" or "!!!!!!". */
function hasExcessiveRepetition(text: string): boolean {
  return /([^\s])\1{4,}/.test(text);
}

/** Adds up suspicion points from each rule. Higher = more likely fake. */
export function scoreReviewHeuristically(input: { rating: number; comment: string }): HeuristicResult {
  const comment = normalize(input.comment);
  const reasons: string[] = [];
  let score = 0;

  // Too short to say anything real about a job.
  if (comment.length < 12) {
    score += 0.35;
    reasons.push("Comment is too short to describe an actual job.");
  }

  // Exact-match filler, the kind a bot drops in to clear the field.
  if (GENERIC_PHRASES.has(comment)) {
    score += 0.3;
    reasons.push("Comment is generic, templated filler.");
  }

  const negativeHits = countMatches(comment, NEGATIVE_WORDS);
  const positiveHits = countMatches(comment, POSITIVE_WORDS);

  // Stars and words disagreeing is the strongest signal here — someone
  // clicking a rating without reading what they pasted.
  if (input.rating >= 4 && negativeHits > 0 && positiveHits === 0) {
    score += 0.4;
    reasons.push("High star rating but the comment reads negative.");
  }
  if (input.rating <= 2 && positiveHits > 0 && negativeHits === 0) {
    score += 0.4;
    reasons.push("Low star rating but the comment reads positive.");
  }

  if (hasExcessiveRepetition(comment)) {
    score += 0.25;
    reasons.push("Comment contains suspicious repeated characters.");
  }

  const exclamationCount = (input.comment.match(/!/g) ?? []).length;
  if (exclamationCount >= 4) {
    score += 0.15;
    reasons.push("Comment is exclamation-mark spam.");
  }

  // Capped at 1 so several rules firing at once can't overflow the scale.
  return { score: Math.min(score, 1), reasons };
}
