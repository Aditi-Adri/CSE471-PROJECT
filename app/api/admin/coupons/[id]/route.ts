import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { updateCouponSchema } from "@/lib/validation/couponSchemas";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/** PATCH /api/admin/coupons/[id] — activate/deactivate a coupon, or change its expiry. */
export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { id } = await params;
    const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return Response.json({ error: "Coupon not found." }, { status: 404 });
    }

    const coupon = await prisma.coupon.update({ where: { id }, data: parsed.data });
    return Response.json({ coupon });
  }
);
