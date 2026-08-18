import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/favorites
 *
 * The signed-in customer's starred workers, newest first.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      worker: {
        select: {
          id: true,
          headline: true,
          verificationTier: true,
          ratingAvg: true,
          ratingCount: true,
          avatarSeed: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  return Response.json({ workers: favorites.map((f) => f.worker) });
});
