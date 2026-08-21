import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// POST /api/workshops/[id]/register
// A worker or customer registers for a workshop. Admins create and
// manage workshops, they don't register for them.
export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role === "ADMIN") {
    return Response.json({ error: "Admins can't register for workshops." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`workshop-register:${session.user.id}:${ip}`, 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const { id } = await params;

  const workshop = await prisma.workshop.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!workshop) {
    return Response.json({ error: "This workshop doesn't exist." }, { status: 404 });
  }

  try {
    await prisma.workshopRegistration.create({
      data: { workshopId: id, userId: session.user.id },
    });
  } catch (err) {
    // Already registered before (unique constraint hit) — that's fine,
    // not a real error.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return Response.json({ status: "REGISTERED" });
    }
    throw err;
  }

  return Response.json({ status: "REGISTERED" }, { status: 201 });
});
