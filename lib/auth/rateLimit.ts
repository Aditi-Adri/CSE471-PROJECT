/**
 * Minimal in-memory rate limiter for the custom auth API routes
 * (register, forgot-password) that don't go through NextAuth's
 * credentials `authorize()` — that flow has its own, database-backed
 * account lockout (see authOptions.ts), which is what actually
 * satisfies "rate-limit failed logins" and survives restarts / runs
 * correctly across multiple server instances.
 *
 * This one is intentionally simple — a per-key counter on a fixed
 * window — which is enough to blunt scripted registration/email-bomb
 * abuse on a single dev or small production instance. It resets on
 * restart and doesn't share state across instances, so swap it for
 * Upstash Redis (`@upstash/ratelimit`) before scaling to serverless
 * multi-instance production.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Best-effort client IP for rate-limit keys (dev server has no proxy). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
