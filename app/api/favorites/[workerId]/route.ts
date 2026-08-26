import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// POST /api/favorites/[workerId]
// Toggles one worker on/off the customer's favorites list.
export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ workerId: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { workerId } = await params;
  const customerId = session.user.id;

  const favoriteModel = (prisma as any).favorite;
  if (!favoriteModel) {
    return Response.json({ favorited: false });
  }

  // Check if this worker is already favorited by this customer.
  const existingFavorite = await favoriteModel.findUnique({
    where: { customerId_workerId: { customerId, workerId } },
  });

  if (existingFavorite) {
    // Already favorited — remove it.
    await favoriteModel.delete({ where: { id: existingFavorite.id } });
    return Response.json({ favorited: false });
  }

  // Not favorited yet — add it.
  await favoriteModel.create({
    data: { customerId, workerId },
  });
  return Response.json({ favorited: true });
});
