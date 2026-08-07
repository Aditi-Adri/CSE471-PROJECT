import { createHash, randomBytes } from "crypto";

/** How long a forgot-password link stays valid after it's emailed. */
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hashes a reset token with SHA-256 (not bcrypt) before it's stored.
 *
 * bcrypt is for low-entropy, user-chosen secrets (passwords) where an
 * attacker can feasibly guess candidates. A reset token is a 256-bit
 * random value — nothing is gained from bcrypt's deliberate slowness,
 * and hashing it lets a database leak alone never yield a usable
 * token (the raw value only ever exists in the emailed link and the
 * requester's browser).
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Generates a new raw reset token plus the hash that gets stored. */
export function generatePasswordResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}
