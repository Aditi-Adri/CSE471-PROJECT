import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { getOrCreateReferralCode } from "@/lib/referrals/referralCode";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/referrals/me — this account's own referral code (generated
 * on first request, see getOrCreateReferralCode) and how many people
 * have signed up with it. Powers components/coupons/ReferralCard.tsx
 * on /account.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const [referralCode, referralCount] = await Promise.all([
    getOrCreateReferralCode(session.user.id),
    prisma.user.count({ where: { referredById: session.user.id } }),
  ]);

  return Response.json({ referralCode, referralCount });
});
