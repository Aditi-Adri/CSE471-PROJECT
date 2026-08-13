import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { changePasswordSchema } from "@/lib/validation/accountSchemas";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * PATCH /api/account/password
 *
 * Two accounts hit this: someone with an existing password rotating
 * it (must prove they know the current one), and a Google-only
 * account setting a password for the first time (nothing to prove —
 * they're already authenticated via their session). Which case applies
 * is read fresh from the DB, not trusted from the client.
 */
export const PATCH = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`account-password:${session.user.id}:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid details.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }

  const { currentPassword, newPassword } = parsed.data;

  if (user.passwordHash) {
    const validCurrent = currentPassword
      ? await verifyPassword(currentPassword, user.passwordHash)
      : false;
    if (!validCurrent) {
      return Response.json({ error: "Current password is incorrect." }, { status: 400 });
    }
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  return Response.json({
    message: user.passwordHash ? "Password updated." : "Password set. You can now also log in with it.",
  });
});
