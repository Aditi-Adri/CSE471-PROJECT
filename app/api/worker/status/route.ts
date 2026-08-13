import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { workerStatusSchema } from "@/lib/validation/sosSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/worker/status
 * body: { isOnline: boolean, lat?: number, lng?: number }
 *
 * MODULE 1 -> FEATURE 3 (Jishan): the "go online" toggle a worker flips
 * to be eligible for SOS matching (see app/api/sos/route.ts) and to show
 * up live on a customer's tracking map. `lat`/`lng` are optional so the
 * client can set them in the same request as flipping online (right
 * after the browser's geolocation permission prompt resolves) without a
 * second round trip; ongoing updates after that go over the
 * `worker:location` socket event instead (see server.ts) since REST
 * round trips aren't the right shape for a continuous GPS stream.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "WORKER") {
    return Response.json({ error: "Only worker accounts have an online status." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`worker-status:${session.user.id}:${ip}`, 30, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many status updates. Please try again shortly." }, { status: 429 });
  }

  const worker = await prisma.worker.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!worker) {
    return Response.json({ error: "Set up your worker profile first." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = workerStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid status update.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { isOnline, lat, lng } = parsed.data;

  const updated = await prisma.worker.update({
    where: { id: worker.id },
    data: {
      isOnline,
      ...(lat != null && lng != null ? { currentLat: lat, currentLng: lng, locationUpdatedAt: new Date() } : {}),
    },
    select: { isOnline: true, currentLat: true, currentLng: true },
  });

  return Response.json({ worker: updated });
});
