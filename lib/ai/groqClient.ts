/**
 * Optional AI classification path using Groq's free tier
 * (https://console.groq.com — no billing required for the free-tier
 * request quota; runs open models like Llama at very high speed).
 *
 * This is intentionally NOT the primary path — see categoryMapper.ts.
 * It's a straight swap-in for the "OpenAI API" call described in the
 * project spec's Module 1 / Feature 2 requirement: same job (map free
 * text -> a known service category), same "send the text server-side to
 * an LLM" shape, just pointed at a provider with a genuinely free tier
 * instead of a paid one, per the team's free-APIs-only constraint.
 *
 * (We originally wired this up against Google's Gemini API — see git
 * history — but free-tier access was blocked for the account available
 * to us. Groq's API is OpenAI-compatible, which is why the request
 * shape below looks like a standard chat-completions call.)
 *
 * Every call is wrapped in a timeout and never throws — on any failure
 * (missing key, network error, quota, bad response) it resolves to
 * `null` and the caller (categoryMapper.ts) falls back to the keyword
 * engine automatically.
 */

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_TIMEOUT_MS = 5000;

export type GroqCategoryResult = {
  categoryId: string;
  confidence: number;
};

type CategoryOption = { id: string; name: string };

export async function classifyWithGroq(
  query: string,
  categories: readonly CategoryOption[],
  opts: { apiKey: string; model?: string; timeoutMs?: number }
): Promise<GroqCategoryResult | null> {
  const { apiKey, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  if (!apiKey || categories.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const categoryList = categories.map((c) => `- ${c.name} (id: ${c.id})`).join("\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You classify a Dhaka home-services customer's free-text problem " +
              "description into exactly one service category from a fixed list. " +
              "Reply with strict JSON only: {\"categoryId\": string, \"confidence\": number} " +
              "matching one of the given category ids. If nothing plausibly matches, " +
              "set categoryId to an empty string.",
          },
          {
            role: "user",
            content: `Customer's message: "${query}"\n\nAvailable categories:\n${categoryList}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text: string | undefined = payload?.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as { categoryId?: string; confidence?: number };
    if (!parsed.categoryId) return null;

    const matched = categories.find((c) => c.id === parsed.categoryId);
    if (!matched) return null;

    const confidence = typeof parsed.confidence === "number"
      ? Math.min(Math.max(parsed.confidence, 0), 1)
      : 0.7;

    return { categoryId: matched.id, confidence };
  } catch {
    // Network error, timeout, bad JSON, quota exceeded, etc. — the
    // keyword engine takes over silently.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Second use of the same free Groq call, this time plain-text
 * summarization rather than classification — turns the neighborhood
 * demand heatmap's raw per-area numbers (lib/opportunities/
 * demandScore.ts) into one short, actionable sentence for a worker.
 * Same never-throws-returns-null-on-any-failure contract as
 * classifyWithGroq — see lib/opportunities/opportunityInsight.ts for
 * the deterministic fallback that takes over when this returns null.
 */
export async function summarizeOpportunitiesWithGroq(
  prompt: string,
  opts: { apiKey: string; model?: string; timeoutMs?: number }
): Promise<string | null> {
  const { apiKey, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  if (!apiKey) return null;

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
        temperature: 0.4,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "You are a terse local-services market analyst for Dhaka. Given " +
              "neighborhood-level worker supply/demand numbers, write ONE short " +
              "sentence (max ~30 words) telling a technician where to focus " +
              "today and why, using the actual area names and numbers given. " +
              "No greeting, no markdown, plain text only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text: string | undefined = payload?.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Third use of the same free Groq client — MODULE 2 -> FEATURE 4
 * (Jishan): Worker Income Intelligence Dashboard's "OpenAI Business
 * Coaching" requirement, pointed at Groq instead of OpenAI per the
 * team's documented free-APIs-only constraint (see
 * docs/FEATURE_SPEC.md's tech-stack table). Turns a worker's
 * already-computed, real income summary into a personalized weekly
 * business suggestion + a localized upcoming-demand prediction. Same
 * never-throws-returns-null-on-any-failure contract as the two
 * functions above — lib/income/generateCoaching.ts supplies the
 * deterministic fallback that takes over when this returns null.
 */
export type IncomeCoachingResult = {
  suggestionText: string;
  demandForecastText: string;
};

export async function generateIncomeCoachingWithGroq(
  prompt: string,
  opts: { apiKey: string; model?: string; timeoutMs?: number }
): Promise<IncomeCoachingResult | null> {
  const { apiKey, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  if (!apiKey) return null;

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
        temperature: 0.4,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a business coach for an independent home-services technician in Dhaka. " +
              "Given their real recent earnings summary, reply with strict JSON only: " +
              '{"suggestion": string, "demandForecast": string}. ' +
              '"suggestion" is ONE short, actionable sentence (max ~35 words) about how they ' +
              "personally could earn more, grounded in the actual numbers given (top category, " +
              'peak hours, etc.) — no generic advice. "demandForecast" is ONE short sentence ' +
              "(max ~30 words) speculating which service categories may see stronger demand in " +
              'their district next period, based on their own recent job history — phrase it as ' +
              'a prediction/possibility ("may", "could"), never a guaranteed fact. No greeting, ' +
              "no markdown, plain text only inside the JSON string values.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text: string | undefined = payload?.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as { suggestion?: string; demandForecast?: string };
    if (!parsed.suggestion || !parsed.demandForecast) return null;

    return { suggestionText: parsed.suggestion.trim(), demandForecastText: parsed.demandForecast.trim() };
  } catch {
    // Network error, timeout, bad JSON, quota exceeded, etc. — the
    // deterministic fallback in lib/income/generateCoaching.ts takes over.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
