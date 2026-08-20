import { randomBytes } from "crypto";

/**
 * Alphabet for human-typed codes (referral codes, auto-generated coupon
 * codes): uppercase letters + digits, minus 0/O and 1/I — those pairs
 * are too easy to mistype or misread off a screen, and a wrong
 * character just means "invalid code" rather than a security issue.
 *
 * Exactly 32 characters (a power of two) on purpose: `byte % 32` then
 * maps every possible byte value (0-255) onto the alphabet exactly 8
 * times each, with no leftover remainder skewing the low end. A
 * 31-character alphabet would have made bytes 248-255 wrap around and
 * land on index 0-7 an extra time, very slightly biasing codes toward
 * A-H.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A short, random, human-typeable code — e.g. "K7QXTF2M". */
export function generateShortCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}
