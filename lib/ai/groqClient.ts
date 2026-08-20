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

// Groq retires models fairly often — llama-3.3-70b-versatile, what this
// used to point at, now 404s with "model does not exist", which made
// every AI call fail silently and fall back to the keyword engine
// (matchMethod came back "KEYWORD" even with a valid key set). Check
// https://console.groq.com/docs/models, or GET /openai/v1/models with
// the API key, if that happens again.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
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
        // Generous for a ~30-word answer on purpose: gpt-oss is a
        // reasoning model, so it spends tokens thinking before it
        // writes anything (~220 here). At the old cap of 120 the
        // reasoning alone used all of them and `content` came back as
        // an empty string, which read as a failure and silently fell
        // back to the deterministic sentence every single time.
        max_tokens: 500,
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
