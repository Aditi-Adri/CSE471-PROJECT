/**
 * MODULE 4 (Shiva): whether a coupon can actually be applied right
 * now, for this user, on this order — pure decision logic, no
 * database access. The caller (app/api/coupons/validate/route.ts,
 * app/api/shop/orders/route.ts) loads the coupon row and the two
 * redemption counts, and this just answers yes/no from that.
 *
 * Kept as one function both routes share so "can I apply this code"
 * (the live preview while typing it in) and "did this code actually
 * apply" (the real checkout) can never quietly disagree.
 */

export type CouponEligibilityReason =
  | "not_found"
  | "inactive"
  | "expired"
  | "not_yours"
  | "below_minimum_order"
  | "usage_limit_reached"
  | "already_used";

export type CouponEligibility = { eligible: true } | { eligible: false; reason: CouponEligibilityReason };

export type CouponForEligibility = {
  isActive: boolean;
  expiresAt: Date | null;
  issuedToUserId: string | null;
  minOrderBdt: number | null;
  usageLimit: number | null;
  perUserLimit: number;
};

export type CouponEligibilityInput = {
  coupon: CouponForEligibility | null;
  userId: string;
  orderTotalBdt: number;
  /** How many times this code has been redeemed, across every user. */
  totalRedemptions: number;
  /** How many times this user specifically has redeemed this code. */
  userRedemptions: number;
  now?: Date;
};

export function checkCouponEligibility(input: CouponEligibilityInput): CouponEligibility {
  const { coupon, userId, orderTotalBdt, totalRedemptions, userRedemptions } = input;
  const now = input.now ?? new Date();

  if (!coupon) return { eligible: false, reason: "not_found" };
  if (!coupon.isActive) return { eligible: false, reason: "inactive" };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) {
    return { eligible: false, reason: "expired" };
  }
  if (coupon.issuedToUserId && coupon.issuedToUserId !== userId) {
    return { eligible: false, reason: "not_yours" };
  }
  if (coupon.minOrderBdt != null && orderTotalBdt < coupon.minOrderBdt) {
    return { eligible: false, reason: "below_minimum_order" };
  }
  if (coupon.usageLimit != null && totalRedemptions >= coupon.usageLimit) {
    return { eligible: false, reason: "usage_limit_reached" };
  }
  if (userRedemptions >= coupon.perUserLimit) {
    return { eligible: false, reason: "already_used" };
  }
  return { eligible: true };
}

/** A friendly, user-facing message for each rejection reason. */
export function describeCouponEligibilityReason(
  reason: CouponEligibilityReason,
  coupon?: Pick<CouponForEligibility, "minOrderBdt"> | null
): string {
  switch (reason) {
    case "not_found":
    case "not_yours":
      // Same message for both, deliberately — distinguishing "doesn't
      // exist" from "exists but is someone else's private coupon"
      // would let /api/coupons/validate be used to probe whether a
      // guessed/leaked code is a real, active coupon issued to
      // another user.
      return "That coupon code doesn't exist or isn't available on your account.";
    case "inactive":
      return "This coupon is no longer active.";
    case "expired":
      return "This coupon has expired.";
    case "below_minimum_order":
      return coupon?.minOrderBdt
        ? `Add at least ৳${coupon.minOrderBdt} to your cart to use this coupon.`
        : "Your order doesn't meet this coupon's minimum spend.";
    case "usage_limit_reached":
      return "This coupon has reached its usage limit.";
    case "already_used":
      return "You've already used this coupon.";
  }
}
