import { prisma } from "@/lib/db";
import { generateCouponCode } from "@/lib/coupons/generateCouponCode";
import { REFERRAL_REWARD } from "./referralConfig";

/**
 * Rewards both sides of a successful referral with a matching, private
 * coupon (see prisma/schema.prisma's Coupon model — `issuedToUserId`
 * is what makes it private to exactly that one person, and
 * `perUserLimit: 1` is redundant with that but documents the intent).
 *
 * Called once, right after a new account is created with someone
 * else's referral code — see app/api/auth/register/route.ts. Not part
 * of that same DB transaction: user creation there isn't
 * transactional either, and a failure here (astronomically unlikely —
 * generateCouponCode only throws after repeated collisions) shouldn't
 * be able to undo an otherwise-successful registration.
 */
export async function issueReferralReward(referrerId: string, referredUserId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + REFERRAL_REWARD.expiresInDays * 24 * 60 * 60 * 1000);

  for (const recipientId of [referrerId, referredUserId]) {
    const code = await generateCouponCode();
    await prisma.coupon.create({
      data: {
        code,
        discountType: REFERRAL_REWARD.discountType,
        value: REFERRAL_REWARD.value,
        maxDiscountBdt: REFERRAL_REWARD.maxDiscountBdt,
        minOrderBdt: REFERRAL_REWARD.minOrderBdt,
        perUserLimit: 1,
        expiresAt,
        source: "REFERRAL",
        issuedToUserId: recipientId,
      },
    });
  }
}
