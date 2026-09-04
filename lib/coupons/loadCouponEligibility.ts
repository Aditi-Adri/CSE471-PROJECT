import { prisma } from "@/lib/db";
import { checkCouponEligibility, type CouponEligibility } from "./couponEligibility";

/**
 * Loads a coupon by code plus its two redemption counts, and runs
 * checkCouponEligibility over them.
 *
 * `db` is typed structurally (just the two delegates this needs)
 * rather than as `PrismaClient` so the same function works both for a
 * live preview (app/api/coupons/validate — passing `prisma`, purely
 * read-only, nothing here needs to be race-proof for a preview) and
 * inside the checkout's own transaction (app/api/shop/orders —
 * passing `tx`).
 *
 * On its own, passing `tx` would *not* make the counts here race-proof
 * against a genuinely concurrent redemption of the same code (Postgres'
 * default READ COMMITTED isolation lets two simultaneous transactions
 * each read "not yet at the limit" before either commits) — the
 * checkout route closes that with a `pg_advisory_xact_lock` taken
 * before calling this, not by anything in here. See the comment at
 * that call site.
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
