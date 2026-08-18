import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/favorites/[workerId]
 *
 * Toggles a favorite - star it if not already starred, unstar it if
 * it is. Customer accounts only.
 */
export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ workerId: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { workerId } = await params;

  const existing = await prisma.favorite.findUnique({
    where: { customerId_workerId: { customerId: session.user.id, workerId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return Response.json({ favorited: false });
  }

  await prisma.favorite.create({
    data: { customerId: session.user.id, workerId },
  });
  return Response.json({ favorited: true });
});
