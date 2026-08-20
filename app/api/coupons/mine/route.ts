import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/coupons/mine — coupons this account can still use right
 * now: private ones issued straight to them (referral rewards) plus
 * any public admin coupon, minus whichever they've already exhausted.
 * Powers the "My coupons" page (components/coupons/MyCouponsList.tsx).
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  const userId = session.user.id;

  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ issuedToUserId: userId }, { issuedToUserId: null }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      redemptions: { where: { userId }, select: { id: true } },
      _count: { select: { redemptions: true } },
    },
  });

  const now = new Date();
  const usable = coupons
    .filter((coupon) => !coupon.expiresAt || coupon.expiresAt > now)
    .filter((coupon) => coupon.usageLimit == null || coupon._count.redemptions < coupon.usageLimit)
    .filter((coupon) => coupon.redemptions.length < coupon.perUserLimit)
    .map((coupon) => ({
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      maxDiscountBdt: coupon.maxDiscountBdt,
      minOrderBdt: coupon.minOrderBdt,
      expiresAt: coupon.expiresAt,
      source: coupon.source,
    }));

  return Response.json({ coupons: usable });
});
