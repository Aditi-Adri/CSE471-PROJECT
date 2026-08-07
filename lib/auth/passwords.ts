import bcrypt from "bcryptjs";

/**
 * bcrypt cost factor. 12 is the current OWASP-recommended floor for an
 * interactive login endpoint — high enough to resist offline cracking
 * if the database ever leaks, low enough to keep login/register
 * requests fast.
 */
const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
