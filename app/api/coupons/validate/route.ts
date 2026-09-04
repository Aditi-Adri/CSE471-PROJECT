import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { validateCouponSchema } from "@/lib/validation/couponSchemas";
import { loadCouponEligibility } from "@/lib/coupons/loadCouponEligibility";
import { computeDiscountBdt } from "@/lib/coupons/couponMath";
import { describeCouponEligibilityReason } from "@/lib/coupons/couponEligibility";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/coupons/validate — live "does this code work" preview
 * while typing a coupon into the shop cart, before actually checking
 * out. Doesn't redeem anything; app/api/shop/orders/route.ts
 * re-checks eligibility for real at the moment an order is placed
 * (this endpoint alone is never enough to apply a discount).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = validateCouponSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  const { code, orderTotalBdt } = parsed.data;

  const { coupon, eligibility } = await loadCouponEligibility(prisma, code, session.user.id, orderTotalBdt);

  if (!eligibility.eligible) {
    return Response.json({
      valid: false,
      reason: eligibility.reason,
      message: describeCouponEligibilityReason(eligibility.reason, coupon),
    });
  }

  const discountBdt = computeDiscountBdt(coupon!, orderTotalBdt);

  return Response.json({
    valid: true,
    code: coupon!.code,
    discountBdt,
    finalTotalBdt: orderTotalBdt - discountBdt,
  });
});
