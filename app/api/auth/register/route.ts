import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { registerSchema } from "@/lib/validation/authSchemas";

/**
 * POST /api/auth/register
 *
 * Creates a User with a bcrypt-hashed password. Doesn't sign the user
 * in itself — the client follows up with `signIn("credentials", ...)`
 * so cookie issuance always goes through NextAuth's own flow rather
 * than a hand-rolled one here.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`register:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many sign-up attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid registration details.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { name, email, phone, password, role } = parsed.data;
  const normalizedPhone = phone ? phone : null;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  if (normalizedPhone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingPhone) {
      return Response.json(
        { error: "An account with this phone number already exists." },
        { status: 409 }
      );
    }
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, phone: normalizedPhone, passwordHash, role },
    select: { id: true, name: true, email: true, role: true },
  });

  return Response.json({ user }, { status: 201 });
}
