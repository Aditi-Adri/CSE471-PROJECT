/**
 * MODULE 4 (Shiva): tunable numbers for the referral reward, in one
 * place so "how generous is a referral" is a one-line change instead
 * of a hunt through lib/referrals/issueReferralReward.ts.
 *
 * Both the referrer and the person who just signed up get an
 * identical coupon — see issueReferralReward.ts.
 */
export const REFERRAL_REWARD = {
  discountType: "PERCENT" as const,
  value: 10,
  maxDiscountBdt: 200,
  minOrderBdt: 300,
  expiresInDays: 90,
};
