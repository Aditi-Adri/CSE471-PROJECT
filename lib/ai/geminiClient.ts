/**
 * Optional AI classification path using Google Gemini's free tier
 * (https://aistudio.google.com/apikey — no billing required for the
 * free-tier request quota).
 *
 * This is intentionally NOT the primary path — see categoryMapper.ts.
 * It's a straight swap-in for the "OpenAI API" call described in the
 * project spec's Module 1 / Feature 2 requirement: same job (map free
 * text -> a known service category), same "send the text server-side to
 * an LLM" shape, just pointed at a provider with a genuinely free tier
 * instead of a paid one, per the team's free-APIs-only constraint.
 *
 * Every call is wrapped in a timeout and never throws — on any failure
 * (missing key, network error, quota, bad response) it resolves to
 * `null` and the caller (categoryMapper.ts) falls back to the keyword
 * engine automatically.
 */

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 5000;

export type GeminiCategoryResult = {
  categoryId: string;
  confidence: number;
};

type CategoryOption = { id: string; name: string };

export async function classifyWithGemini(
  query: string,
  categories: readonly CategoryOption[],
  opts: { apiKey: string; model?: string; timeoutMs?: number }
): Promise<GeminiCategoryResult | null> {
  const { apiKey, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  if (!apiKey || categories.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const categoryList = categories.map((c) => `- ${c.name} (id: ${c.id})`).join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "You classify a Dhaka home-services customer's free-text problem " +
                  "description into exactly one service category from a fixed list. " +
                  "Reply with strict JSON only, matching the response schema. " +
                  "If nothing plausibly matches, set categoryId to an empty string.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    `Customer's message: "${query}"\n\nAvailable categories:\n${categoryList}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                categoryId: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["categoryId", "confidence"],
            },
          },
        }),
      }
    );

    if (!response.ok) return null;

    const payload = await response.json();
    const text: string | undefined = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
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
