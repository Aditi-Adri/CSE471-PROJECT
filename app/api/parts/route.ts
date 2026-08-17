import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/parts
 *
 * The spare parts catalog a hired worker buys from — testers, wiring,
 * that kind of thing. Simple list, no filters. Signed-in only, same
 * as the rest of the app.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const parts = await prisma.part.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true, stockQty: true },
  });

  return Response.json({ parts });
});
