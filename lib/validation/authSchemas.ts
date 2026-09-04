import { z } from "zod";
import { optionalPhoneSchema } from "./phone";

/**
 * Roles selectable at public sign-up. ADMIN is intentionally excluded
 * here — letting anyone self-register as an admin would be a
 * privilege-escalation bug, not a feature. Admin accounts should be
 * promoted manually (DB/`prisma studio`, or a future internal admin
 * tool), never created through the public form.
 */
export const PUBLIC_ROLES = ["CUSTOMER", "WORKER", "CORPORATE"] as const;
export type PublicRole = (typeof PUBLIC_ROLES)[number];

// Exported so any flow that collects a new password (registration,
// reset, and the dashboard's change-password form) enforces the exact
// same rule instead of three schemas quietly drifting apart.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  // bcrypt silently ignores bytes beyond 72 — cap input so what the
  // user typed is actually what gets checked, always.
  .max(72, "Password must be under 72 characters.")
  .regex(/[a-zA-Z]/, "Password must include at least one letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    phone: optionalPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(PUBLIC_ROLES),
    // MODULE 4 (Shiva): optional — someone else's referral code. A
    // wrong/unknown code doesn't block sign-up (see the register
    // route), so this is intentionally not validated against the
    // database here, just shaped.
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Missing reset token."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const completeProfileSchema = z.object({
  phone: optionalPhoneSchema,
  role: z.enum(PUBLIC_ROLES),
});
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
