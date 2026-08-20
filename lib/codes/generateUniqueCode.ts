import { generateShortCode } from "./generateShortCode";

/**
 * Generates a short code and retries on the rare collision, instead of
 * trusting randomness alone against a unique DB column. `isTaken`
 * checks one candidate (a `findUnique` by whoever's calling this — see
 * lib/referrals/referralCode.ts and lib/coupons/generateCouponCode.ts).
 *
 * 8 chars from a 32-symbol alphabet is ~2^40 of combinations, so a
 * collision here would be exceptionally unlucky — this loop is a
 * correctness guarantee, not something expected to actually retry in
 * practice.
 */
export async function generateUniqueCode(
  isTaken: (code: string) => Promise<boolean>,
  length = 8,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateShortCode(length);
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }
  throw new Error(`Could not generate a unique ${length}-character code after ${maxAttempts} attempts.`);
}
