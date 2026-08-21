import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// GET /api/complaints/mine
// The signed-in customer's own filed complaints, newest first — shows
// whether each one is still pending, and the admin's reply once resolved.
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const complaints = await prisma.complaint.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      adminReply: true,
      resolvedAt: true,
      createdAt: true,
      worker: { select: { id: true, headline: true, user: { select: { name: true } } } },
    },
  });

  return Response.json({ complaints });
});
