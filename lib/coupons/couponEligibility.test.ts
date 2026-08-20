import { describe, expect, it } from "vitest";
import { checkCouponEligibility, describeCouponEligibilityReason, type CouponForEligibility } from "./couponEligibility";

const baseCoupon: CouponForEligibility = {
  isActive: true,
  expiresAt: null,
  issuedToUserId: null,
  minOrderBdt: null,
  usageLimit: null,
  perUserLimit: 1,
};

const baseInput = {
  coupon: baseCoupon,
  userId: "user-1",
  orderTotalBdt: 1000,
  totalRedemptions: 0,
  userRedemptions: 0,
};

describe("checkCouponEligibility", () => {
  it("accepts a plain, unused, active coupon", () => {
    expect(checkCouponEligibility(baseInput)).toEqual({ eligible: true });
  });

  it("rejects a coupon that doesn't exist", () => {
    expect(checkCouponEligibility({ ...baseInput, coupon: null })).toEqual({
      eligible: false,
      reason: "not_found",
    });
  });

  it("rejects a deactivated coupon", () => {
    expect(checkCouponEligibility({ ...baseInput, coupon: { ...baseCoupon, isActive: false } })).toEqual({
      eligible: false,
      reason: "inactive",
    });
  });

  it("rejects an expired coupon", () => {
    const coupon = { ...baseCoupon, expiresAt: new Date("2020-01-01") };
    expect(checkCouponEligibility({ ...baseInput, coupon, now: new Date("2026-01-01") })).toEqual({
      eligible: false,
      reason: "expired",
    });
  });

  it("accepts a coupon on its exact expiry moment but not after", () => {
    const expiresAt = new Date("2026-01-01T00:00:00.000Z");
    const coupon = { ...baseCoupon, expiresAt };
    expect(checkCouponEligibility({ ...baseInput, coupon, now: expiresAt })).toEqual({ eligible: true });
    expect(
      checkCouponEligibility({ ...baseInput, coupon, now: new Date(expiresAt.getTime() + 1) })
    ).toEqual({ eligible: false, reason: "expired" });
  });

  it("rejects a private coupon issued to someone else", () => {
    const coupon = { ...baseCoupon, issuedToUserId: "someone-else" };
    expect(checkCouponEligibility({ ...baseInput, coupon })).toEqual({ eligible: false, reason: "not_yours" });
  });

  it("accepts a private coupon issued to the requesting user", () => {
    const coupon = { ...baseCoupon, issuedToUserId: "user-1" };
    expect(checkCouponEligibility({ ...baseInput, coupon })).toEqual({ eligible: true });
  });

  it("rejects an order below the coupon's minimum spend", () => {
    const coupon = { ...baseCoupon, minOrderBdt: 500 };
    expect(checkCouponEligibility({ ...baseInput, coupon, orderTotalBdt: 499 })).toEqual({
      eligible: false,
      reason: "below_minimum_order",
    });
    expect(checkCouponEligibility({ ...baseInput, coupon, orderTotalBdt: 500 })).toEqual({ eligible: true });
  });

  it("rejects once the total usage limit is reached", () => {
    const coupon = { ...baseCoupon, usageLimit: 10 };
    expect(checkCouponEligibility({ ...baseInput, coupon, totalRedemptions: 10 })).toEqual({
      eligible: false,
      reason: "usage_limit_reached",
    });
  });

  it("rejects once this user has hit their own per-user limit", () => {
    const coupon = { ...baseCoupon, perUserLimit: 2 };
    expect(checkCouponEligibility({ ...baseInput, coupon, userRedemptions: 2 })).toEqual({
      eligible: false,
      reason: "already_used",
    });
    expect(checkCouponEligibility({ ...baseInput, coupon, userRedemptions: 1 })).toEqual({ eligible: true });
  });
});

describe("describeCouponEligibilityReason", () => {
  it("interpolates the minimum order amount when known", () => {
    expect(describeCouponEligibilityReason("below_minimum_order", { minOrderBdt: 500 })).toContain("৳500");
  });

  it("falls back to a generic message when the minimum isn't known", () => {
    expect(describeCouponEligibilityReason("below_minimum_order")).not.toContain("৳");
  });
});
