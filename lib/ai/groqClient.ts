// Calls Groq's free AI API (https://console.groq.com) — used for
// category classification (below) and for the heatmap's AI summary
// sentence (summarizeOpportunitiesWithGroq, further down). Every call
// has a timeout and never throws: on any failure it just returns null,
// and the caller falls back to a non-AI method automatically.

// Groq retires old models sometimes — if this ever starts always
// falling back (matchMethod "KEYWORD" even with a real API key set),
// check https://console.groq.com/docs/models for the current name.
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

// Same Groq call, but for plain-text summarizing instead of
// classifying — turns the heatmap's per-area numbers into one short
// sentence for a worker. Same "never throws, returns null on failure"
// behavior as classifyWithGroq above.
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
        // This model "thinks" before writing its answer, which also
        // uses up tokens — so the cap needs to be generous even for a
        // short ~30-word reply, or the answer comes back empty.
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
