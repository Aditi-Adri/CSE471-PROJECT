import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { hashToken } from "@/lib/auth/tokens";
import { resetPasswordSchema } from "@/lib/validation/authSchemas";

const INVALID_TOKEN_ERROR = "This reset link is invalid or has expired. Request a new one.";

/**
 * POST /api/auth/reset-password
 *
 * Consumes a one-time password-reset token (see forgot-password/route.ts)
 * and sets a new password. Also clears any login lockout, since a
 * successful reset is proof of ownership stronger than the password
 * that was locked out.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`reset-password:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return Response.json({ error: INVALID_TOKEN_ERROR }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return Response.json({ message: "Password updated. You can now log in." });
}
