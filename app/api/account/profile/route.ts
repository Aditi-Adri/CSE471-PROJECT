import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validation/accountSchemas";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * PATCH /api/account/profile
 *
 * Updates the fields every role's dashboard lets someone edit about
 * themselves: display name, phone number, and saved address. Anything
 * role-specific (worker rates, corporate billing details, ...) has its
 * own dedicated endpoint — this one only ever touches the shared User
 * fields.
 */
export const PATCH = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid details.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { name, phone, address } = parsed.data;
  const normalizedPhone = phone ? phone : null;
  const normalizedAddress = address ? address : null;

  if (normalizedPhone) {
    const existingPhone = await prisma.user.findFirst({
      where: { phone: normalizedPhone, NOT: { id: session.user.id } },
    });
    if (existingPhone) {
      return Response.json({ error: "That phone number is already in use." }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, phone: normalizedPhone, address: normalizedAddress },
    select: { name: true, phone: true, address: true },
  });

  return Response.json({ user: updated });
});
