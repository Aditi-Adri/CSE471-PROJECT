/**
 * MODULE 4 (Shiva): pure discount arithmetic for the coupon system —
 * kept separate from the DB-touching eligibility check
 * (couponEligibility.ts) so it can be unit-tested without a database,
 * same split as lib/trust/trustScoreMath.ts and
 * lib/opportunities/demandScoreMath.ts.
 */

export type CouponDiscount = {
  discountType: "PERCENT" | "FIXED";
  value: number;
  maxDiscountBdt: number | null;
};

/**
 * How many taka a coupon takes off an order.
 *
 * - PERCENT: `value` percent of the order, rounded to the nearest taka,
 *   then capped by `maxDiscountBdt` if one is set.
 * - FIXED: `value` taka off, flat.
 *
 * Either way, the discount never exceeds the order total itself (no
 * negative bills) and is never negative (a malformed coupon can't turn
 * into free money).
 */
export function computeDiscountBdt(coupon: CouponDiscount, orderTotalBdt: number): number {
  const rawDiscount =
    coupon.discountType === "PERCENT" ? Math.round((orderTotalBdt * coupon.value) / 100) : coupon.value;

  // maxDiscountBdt only ever caps a PERCENT discount (see the doc
  // comment above and on Coupon.maxDiscountBdt in schema.prisma) — a
  // FIXED coupon's value already *is* the taka amount, so applying the
  // cap to it too would silently shrink an admin's flat "৳X off" down
  // to whatever the cap happens to be.
  const capped =
    coupon.discountType === "PERCENT" && coupon.maxDiscountBdt != null
      ? Math.min(rawDiscount, coupon.maxDiscountBdt)
      : rawDiscount;

  // Money in this app is always whole taka (the "Bdt" Int convention
  // used everywhere from wageBdt to budgetMinBdt) — round defensively
  // here too, so a caller that ever passes a fractional orderTotalBdt
  // can't produce a fractional result that then fails to insert into
  // the Int discountBdt columns.
  return Math.round(Math.max(0, Math.min(capped, orderTotalBdt)));
}
