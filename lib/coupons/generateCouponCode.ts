import { prisma } from "@/lib/db";
import { generateUniqueCode } from "@/lib/codes/generateUniqueCode";

/** A fresh, unused Coupon.code — used for referral rewards, and as the
 * fallback when an admin creates a coupon without typing their own code. */
export async function generateCouponCode(): Promise<string> {
  return generateUniqueCode(async (code) => {
    const existing = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    return existing !== null;
  });
}
