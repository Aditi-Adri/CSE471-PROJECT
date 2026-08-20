import { z } from "zod";

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
    expiresAt: z.coerce.date().optional(),
  })
  .refine((data) => data.discountType !== "PERCENT" || data.value <= 100, {
    message: "A percentage discount can't be more than 100.",
    path: ["value"],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

/** PATCH /api/admin/coupons/[id] — activate/deactivate or change expiry. */
export const updateCouponSchema = z.object({
  isActive: z.boolean().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
