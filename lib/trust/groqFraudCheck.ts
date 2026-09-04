/**
 * MODULE 2 -> FEATURE 1 (Shiva): Review Fraud Detection — optional AI
 * path using Groq's free tier (see lib/ai/groqClient.ts for the same
 * pattern already in use for search category mapping — this is a
 * separate function, not a shared one, because the prompt/response
 * shape is entirely different: a fraud-likelihood judgment on a single
 * review, not a pick-one-of-N classification).
 *
 * Every call is wrapped in a timeout and never throws — on any failure
 * (missing key, network error, quota, bad response) it resolves to
 * `null` and the caller (fraudDetector.ts) falls back to the free local
 * heuristic automatically, same "AI-or-free-fallback" shape the whole
 * team follows per the free-APIs-only constraint (see
 * docs/FEATURE_SPEC.md).
 */

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_TIMEOUT_MS = 5000;

export type GroqFraudResult = {
  /** 0..1, higher = more likely fake. */
  score: number;
  reason: string;
};

export async function classifyReviewWithGroq(
  input: { rating: number; comment: string },
  opts: { apiKey: string; model?: string; timeoutMs?: number }
): Promise<GroqFraudResult | null> {
  const { apiKey, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  if (!apiKey || !input.comment.trim()) return null;

  // Cancels the request if Groq takes too long — without this the
  // customer would sit on a frozen "Submitting…" button.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        // 0 = no randomness, so the same review always scores the same.
        temperature: 0,
        // Forces valid JSON back instead of a chatty sentence that
        // JSON.parse below would choke on.
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You screen a customer review of a home-services technician for signs " +
              "it's fake (bot-generated, incentivized/paid, copy-pasted filler, or a " +
              "rating that contradicts the text). Reply with strict JSON only: " +
              '{"fraudScore": number, "reason": string} where fraudScore is 0..1 ' +
              "(higher = more likely fake) and reason is one short sentence. A " +
              "genuine but harshly negative review is NOT fraud — judge authenticity, " +
              "not sentiment.",
          },
          {
            role: "user",
            content: `Star rating: ${input.rating}/5\nReview text: "${input.comment}"`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text: string | undefined = payload?.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as { fraudScore?: number; reason?: string };
    if (typeof parsed.fraudScore !== "number") return null;

    return {
      // Never trust the model to stay in range — clamp it to 0..1.
      score: Math.min(Math.max(parsed.fraudScore, 0), 1),
      reason: parsed.reason?.trim() || "Flagged by AI review.",
    };
  } catch {
    // Network error, timeout, bad JSON, quota exceeded, etc. — the
    // local heuristic takes over silently.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
