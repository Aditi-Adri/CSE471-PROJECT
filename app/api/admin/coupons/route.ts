import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { createCouponSchema } from "@/lib/validation/couponSchemas";
import { generateCouponCode } from "@/lib/coupons/generateCouponCode";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/** GET /api/admin/coupons — every coupon, newest first, for the admin coupon table. */
export const GET = withErrorHandling(async () => {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { redemptions: true } },
      issuedToUser: { select: { name: true, email: true } },
    },
  });

  return Response.json({ coupons });
});

/** POST /api/admin/coupons — create a new (public, unless the caller wants otherwise) coupon. */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createCouponSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Only worth checking when the admin typed their own code —
  // generateCouponCode() already guarantees uniqueness for an
  // auto-generated one, so checking again here would just be a wasted
  // round trip on that path.
  let code = data.code;
  if (code) {
    const existing = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (existing) {
      return Response.json({ error: `Coupon code "${code}" is already in use.` }, { status: 409 });
    }
  } else {
    code = await generateCouponCode();
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType: data.discountType,
        value: data.value,
        // maxDiscountBdt only ever means anything for PERCENT (see
        // lib/coupons/couponMath.ts) — dropped here too, not just in
        // the client form, so a request that skips the UI can't create
        // a FIXED coupon that's silently capped.
        maxDiscountBdt: data.discountType === "PERCENT" ? (data.maxDiscountBdt ?? null) : null,
        minOrderBdt: data.minOrderBdt ?? null,
        usageLimit: data.usageLimit ?? null,
        perUserLimit: data.perUserLimit,
        expiresAt: data.expiresAt ?? null,
        source: "ADMIN",
        createdById: auth.session.user.id,
      },
    });
    return Response.json({ coupon }, { status: 201 });
  } catch (err) {
    // Two admins (or an explicit code racing generateCouponCode's own
    // check) submitting the same code at once — the uniqueness check
    // above can't catch that, the DB's own constraint is the real
    // guard. Same pattern as app/api/job-requests/[id]/apply/route.ts.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return Response.json({ error: `Coupon code "${code}" is already in use.` }, { status: 409 });
    }
    throw err;
  }
});
