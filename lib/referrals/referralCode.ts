import { prisma } from "@/lib/db";
import { generateUniqueCode } from "@/lib/codes/generateUniqueCode";

/**
 * Returns this user's referral code, generating and saving one first
 * if they don't have one yet.
 *
 * Generated lazily (on first request, e.g. opening the account page)
 * rather than at account creation, so this doesn't need to hook every
 * place a User row can be created — credentials registration
 * (app/api/auth/register) and Google SSO both go through NextAuth's
 * Prisma adapter (lib/auth/prismaAdapter.ts), and only one of those is
 * something this feature needed to touch.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (!user) {
    throw new Error(`getOrCreateReferralCode: no user with id ${userId}`);
  }
  if (user.referralCode) {
    return user.referralCode;
  }

  const code = await generateUniqueCode(async (candidate) => {
    const existing = await prisma.user.findUnique({ where: { referralCode: candidate }, select: { id: true } });
    return existing !== null;
  });

  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  return code;
}
