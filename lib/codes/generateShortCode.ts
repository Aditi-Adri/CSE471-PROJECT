import { randomBytes } from "crypto";

/**
 * Alphabet for human-typed codes (referral codes, auto-generated coupon
 * codes): uppercase letters + digits, minus 0/O and 1/I/L — those pairs
 * are too easy to mistype or misread off a screen, and a wrong
 * character just means "invalid code" rather than a security issue.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A short, random, human-typeable code — e.g. "K7QXTF2M". */
export function generateShortCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}
