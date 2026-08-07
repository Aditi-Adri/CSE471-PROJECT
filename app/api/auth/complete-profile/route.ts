import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { completeProfileSchema } from "@/lib/validation/authSchemas";

/**
 * POST /api/auth/complete-profile
 *
 * Fills in the fields Google's OAuth response can't give us (phone,
 * which role they want) for the signed-in user. Reached right after a
 * first-time Google sign-up via NextAuth's `pages.newUser` redirect,
 * but works any time — it's just "update my profile".
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = completeProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid details.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { phone, role } = parsed.data;
  const normalizedPhone = phone ? phone : null;

  if (normalizedPhone) {
    const existingPhone = await prisma.user.findFirst({
      where: { phone: normalizedPhone, NOT: { id: session.user.id } },
    });
    if (existingPhone) {
      return Response.json({ error: "That phone number is already in use." }, { status: 409 });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { phone: normalizedPhone, role },
  });

  return Response.json({ message: "Profile updated." });
}
