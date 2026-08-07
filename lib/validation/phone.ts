import { z } from "zod";

/**
 * Strips common formatting — spaces, dashes, parentheses, dots — before
 * validating. People naturally type "+880 171-234-5678"; rejecting
 * that while only accepting "+8801712345678" made registration look
 * broken for anyone who typed a phone number the normal way.
 *
 * This also runs before storage (not just validation), so the DB's
 * `phone @unique` constraint compares like-for-like — two people
 * typing "the same" number with different formatting shouldn't be
 * treated as different values, or worse, silently allowed as
 * duplicates because the raw strings differ.
 */
function normalizePhone(value: unknown): unknown {
  return typeof value === "string" ? value.trim().replace(/[\s\-().]/g, "") : value;
}

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export const requiredPhoneSchema = z.preprocess(
  normalizePhone,
  z.string().regex(PHONE_REGEX, "Enter a valid phone number.")
);

export const optionalPhoneSchema = z.preprocess(
  normalizePhone,
  z.string().regex(PHONE_REGEX, "Enter a valid phone number.").optional().or(z.literal(""))
);
