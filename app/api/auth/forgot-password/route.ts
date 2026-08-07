import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { generatePasswordResetToken, PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/auth/tokens";
import { forgotPasswordSchema } from "@/lib/validation/authSchemas";
import { sendEmail } from "@/lib/email/mailer";
import { passwordResetEmail } from "@/lib/email/templates";

const GENERIC_RESPONSE = {
  message: "If an account exists for that email, we've sent a password reset link.",
};

/**
 * POST /api/auth/forgot-password
 *
 * Always responds with the same generic message regardless of whether
 * the email is registered — the HTTP response must never reveal
 * account existence. (The *email itself* can safely be more specific,
 * since it only ever reaches whoever controls that inbox.)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`forgot-password:${ip}`, 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return Response.json(GENERIC_RESPONSE);
  }

  if (!user.passwordHash) {
    // Google-only account — there's no password to reset. Tell *them*
    // (via email, not the HTTP response) rather than silently doing
    // nothing, since a confused legitimate user is the likely case.
    // Best-effort: a shared Resend key in sandbox mode can only deliver
    // to its own account's address, so a delivery failure here must
    // never surface as a broken endpoint for whoever's testing this.
    await sendEmail({
      to: user.email,
      subject: "About your HireLocal sign-in",
      text: `Hi ${user.name},\n\nYou (or someone) requested a password reset for this email on HireLocal, but this account signs in with Google — there's no password to reset. Use "Continue with Google" on the login page instead.\n\n— HireLocal`,
      html: `<p>Hi ${user.name},</p><p>You (or someone) requested a password reset for this email on HireLocal, but this account signs in with Google — there's no password to reset. Use "Continue with Google" on the login page instead.</p>`,
    }).catch((err) => console.error("Failed to send 'use Google instead' email:", err));
    return Response.json(GENERIC_RESPONSE);
  }

  // Invalidate any earlier unused links before issuing a new one.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const { raw, hash } = generatePasswordResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  const origin = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const resetUrl = `${origin}/reset-password?token=${raw}`;
  const { subject, html, text } = passwordResetEmail(user.name, resetUrl);

  // Same best-effort reasoning as above: the reset token already
  // exists in the DB regardless of whether the email actually lands,
  // so a delivery failure shouldn't turn into a 500 for the requester.
  await sendEmail({ to: user.email, subject, html, text }).catch((err) =>
    console.error("Failed to send password-reset email:", err)
  );

  return Response.json(GENERIC_RESPONSE);
}
