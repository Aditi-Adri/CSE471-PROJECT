import { z } from "zod";
import { passwordSchema } from "./authSchemas";
import { optionalPhoneSchema } from "./phone";

/**
 * MODULE 1 -> Common Workflows (Shiva): dashboard profile & security
 * settings, shared by every role.
 */

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: optionalPhoneSchema,
  // Free text rather than the Worker model's area+addressDetail split —
  // customers aren't searched/filtered by area, this only ever needs to
  // be read back whole by whoever's driving to it.
  address: z.string().trim().max(300, "Keep the address under 300 characters.").optional().or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * `currentPassword` is optional at the schema level because a
 * Google-only account has no password to confirm yet — the route
 * handler enforces it when the account actually has one
 * (`user.passwordHash !== null`), which is a DB check the schema can't
 * see. `newPassword` reuses the exact same rule as registration/reset.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
