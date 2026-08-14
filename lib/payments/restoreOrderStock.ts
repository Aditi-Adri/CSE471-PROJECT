import { prisma } from "@/lib/db";

/**
 * MODULE 3 (Shiva): stock was already decremented when the order was
 * created (see app/api/shop/orders/route.ts), before the customer
 * ever reached the gateway — a failed or cancelled payment means that
 * sale didn't happen, so the stock it reserved goes back. Guarded on
 * the order still being PENDING so a fail/cancel callback that
 * arrives after the order was somehow already resolved can't
 * double-restore stock.
 */
export async function restoreOrderStock(tranId: string, status: "FAILED" | "CANCELLED"): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { tranId },
    include: { items: { select: { itemId: true, quantity: true } } },
  });
  if (!order || order.paymentStatus !== "PENDING") return;

  await prisma.$transaction([
    ...order.items.map((item) =>
      prisma.item.update({ where: { id: item.itemId }, data: { stockQty: { increment: item.quantity } } })
    ),
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: status } }),
  ]);
}
