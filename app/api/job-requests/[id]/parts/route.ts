import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { buyPartsSchema } from "@/lib/validation/jobRequestSchema";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/job-requests/[id]/parts
 * body: { items: [{ partId, quantity }] }
 *
 * The hired worker buys parts (tester, wiring, whatever) while doing
 * the job. Cost gets added to this job's bill instead of the worker
 * paying for it themselves — the customer pays wage + parts together.
 * Only the worker who was actually hired for this job can buy parts
 * on it.
 */
export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!worker) {
    return Response.json({ error: "Only workers can buy parts." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = buyPartsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { id } = await params;

  const jobRequest = await prisma.jobRequest.findUnique({
    where: { id },
    select: { hiredWorkerId: true },
  });
  if (!jobRequest) {
    return Response.json({ error: "This job doesn't exist." }, { status: 404 });
  }
  if (jobRequest.hiredWorkerId !== worker.id) {
    return Response.json({ error: "You're not the hired worker on this job." }, { status: 403 });
  }

  const partIds = parsed.data.items.map((i) => i.partId);
  const parts = await prisma.part.findMany({ where: { id: { in: partIds } } });
  const partMap = new Map(parts.map((p) => [p.id, p]));

  for (const item of parsed.data.items) {
    const part = partMap.get(item.partId);
    if (!part) {
      return Response.json({ error: "One of those parts doesn't exist." }, { status: 404 });
    }
    if (part.stockQty < item.quantity) {
      return Response.json({ error: `Not enough "${part.name}" in stock.` }, { status: 409 });
    }
  }

  // Decrement stock + create the order in one transaction, so a
  // failure partway through doesn't leave stock decremented with no
  // order to show for it.
  await prisma.$transaction(async (tx) => {
    for (const item of parsed.data.items) {
      await tx.part.update({
        where: { id: item.partId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    await tx.partOrder.create({
      data: {
        jobRequestId: id,
        workerId: worker.id,
        items: {
          create: parsed.data.items.map((item) => ({
            partId: item.partId,
            quantity: item.quantity,
            price: partMap.get(item.partId)!.price,
          })),
        },
      },
    });
  });

  return Response.json({ status: "BOUGHT" }, { status: 201 });
});
