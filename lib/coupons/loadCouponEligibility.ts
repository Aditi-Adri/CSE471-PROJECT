import { prisma } from "@/lib/db";
import { checkCouponEligibility, type CouponEligibility } from "./couponEligibility";

/**
 * Loads a coupon by code plus its two redemption counts, and runs
 * checkCouponEligibility over them.
 *
 * `db` is typed structurally (just the two delegates this needs)
 * rather than as `PrismaClient` so the same function works both for a
 * live preview (app/api/coupons/validate) and inside the checkout's
 * own transaction (app/api/shop/orders — passing `tx`, so the counts
 * it sees can't be raced by two requests redeeming the same
 * single-use code at once).
 */
type CouponDb = Pick<typeof prisma, "coupon" | "couponRedemption">;

export type LoadedCoupon = Awaited<ReturnType<CouponDb["coupon"]["findUnique"]>>;

export async function loadCouponEligibility(
  db: CouponDb,
  code: string,
  userId: string,
  orderTotalBdt: number
): Promise<{ coupon: LoadedCoupon; eligibility: CouponEligibility }> {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });

  const [totalRedemptions, userRedemptions] = coupon
    ? await Promise.all([
        db.couponRedemption.count({ where: { couponId: coupon.id } }),
        db.couponRedemption.count({ where: { couponId: coupon.id, userId } }),
      ])
    : [0, 0];

  const eligibility = checkCouponEligibility({ coupon, userId, orderTotalBdt, totalRedemptions, userRedemptions });
  return { coupon, eligibility };
}
