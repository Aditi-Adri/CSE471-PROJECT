import type { CouponEligibilityReason } from "./couponEligibility";

/**
 * Thrown from inside app/api/shop/orders/route.ts's transaction when a
 * submitted coupon code turns out not to be usable — caught by that
 * route specifically and turned into a 400 with `message`, instead of
 * falling through to the generic 500 every other unexpected error
 * there gets.
 */
export class CouponError extends Error {
  reason: CouponEligibilityReason;

  constructor(reason: CouponEligibilityReason, message: string) {
    super(message);
    this.name = "CouponError";
    this.reason = reason;
  }
}
