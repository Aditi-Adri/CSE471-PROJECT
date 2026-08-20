import { z } from "zod";

/**
 * A coupon's expiry date, as typed into an `<input type="date">`
 * (components/admin/CouponManager.tsx) — a bare "2026-12-31". Plain
 * `new Date("2026-12-31")` parses that as UTC midnight, which is
 * 6 AM *that same day* in Dhaka (this app's only timezone, UTC+6) —
 * an admin picking "expires Dec 31" would see the coupon stop working
 * at 6 AM instead of lasting through the day they chose. Treated as
 * end-of-day in Dhaka time instead.
 */
const couponExpiresAtSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .transform((value) => new Date(`${value}T23:59:59.999+06:00`));

/** POST /api/coupons/validate — a live "does this code work" preview, before checkout. */
export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code.").max(20),
  orderTotalBdt: z.number().int().min(0),
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

/** POST /api/admin/coupons — an admin creating a new coupon. */
export const createCouponSchema = z
  .object({
    // Left blank -> the server generates one (see lib/coupons/generateCouponCode.ts).
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(4, "Use at least 4 characters.")
      .max(20)
      .regex(/^[A-Z0-9]+$/, "Letters and numbers only.")
      .optional(),
    discountType: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().min(1, "Enter a discount value."),
    maxDiscountBdt: z.number().int().min(1).optional(),
    minOrderBdt: z.number().int().min(0).optional(),
    usageLimit: z.number().int().min(1).optional(),
    perUserLimit: z.number().int().min(1).max(50).default(1),
    expiresAt: couponExpiresAtSchema.optional(),
  })
  .refine((data) => data.discountType !== "PERCENT" || data.value <= 100, {
    message: "A percentage discount can't be more than 100.",
    path: ["value"],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

/** PATCH /api/admin/coupons/[id] — activate/deactivate or change expiry. */
export const updateCouponSchema = z.object({
  isActive: z.boolean().optional(),
  expiresAt: couponExpiresAtSchema.nullable().optional(),
});
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
