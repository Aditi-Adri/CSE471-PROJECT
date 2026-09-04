import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { buyPartsSchema } from "@/lib/validation/jobRequestSchema";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// POST /api/job-requests/[id]/parts
// body: { items: [{ partId, quantity }] }
//
// The hired worker buys parts while doing the job. The cost gets
// added to this job's bill — the customer pays the wage and the
// parts together. Only the worker who was actually hired for this
// job is allowed to buy parts on it.
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
  const itemsToBuy = parsed.data.items;

  const { id: jobRequestId } = await params;

  const jobRequest = await prisma.jobRequest.findUnique({
    where: { id: jobRequestId },
    select: { hiredWorkerId: true },
  });
  if (!jobRequest) {
    return Response.json({ error: "This job doesn't exist." }, { status: 404 });
  }
  if (jobRequest.hiredWorkerId !== worker.id) {
    return Response.json({ error: "You're not the hired worker on this job." }, { status: 403 });
  }

  // Look up every part being bought, so we can check stock and prices.
  const partIds = [];
  for (const item of itemsToBuy) {
    partIds.push(item.partId);
  }
  const parts = await prisma.part.findMany({ where: { id: { in: partIds } } });

  // Build a quick lookup: part id -> the part's real data.
  const partsById = new Map();
  for (const part of parts) {
    partsById.set(part.id, part);
  }

  // Check every item is a real part with enough stock, before buying anything.
  for (const item of itemsToBuy) {
    const part = partsById.get(item.partId);
    if (!part) {
      return Response.json({ error: "One of those parts doesn't exist." }, { status: 404 });
    }
    if (part.stockQty < item.quantity) {
      return Response.json({ error: `Not enough "${part.name}" in stock.` }, { status: 409 });
    }
  }

  // Build the order items list with real prices, before saving.
  const orderItems: { partId: string; quantity: number; price: number }[] = [];
  for (const item of itemsToBuy) {
    const part = partsById.get(item.partId);
    orderItems.push({
      partId: item.partId,
      quantity: item.quantity,
      price: part.price,
    });
  }

  // Decrement stock and create the order in one transaction, so a
  // failure partway through can't leave stock reduced with no order
  // to show for it.
  await prisma.$transaction(async (tx) => {
    for (const item of itemsToBuy) {
      await tx.part.update({
        where: { id: item.partId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    await tx.partOrder.create({
      data: {
        jobRequestId,
        workerId: worker.id,
        items: { create: orderItems },
      },
    });
  });

  return Response.json({ status: "BOUGHT" }, { status: 201 });
});
