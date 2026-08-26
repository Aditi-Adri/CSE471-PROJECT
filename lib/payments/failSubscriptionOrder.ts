import { prisma } from "@/lib/db";

/**
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * The subscription twin of lib/payments/restoreOrderStock.ts. A
 * subscription purchase has no stock to give back (there's no
 * inventory involved) — this just marks the order FAILED/CANCELLED so
 * it stops showing as "pending" anywhere. Guarded on the order still
 * being PENDING, same reasoning as restoreOrderStock: a fail/cancel
 * callback that arrives after the order was somehow already resolved
 * can't overwrite a real PAID result.
 */
export async function failSubscriptionOrder(tranId: string, status: "FAILED" | "CANCELLED"): Promise<void> {
  const order = await prisma.subscriptionOrder.findUnique({ where: { tranId } });
  if (!order || order.paymentStatus !== "PENDING") return;

  await prisma.subscriptionOrder.update({ where: { id: order.id }, data: { paymentStatus: status } });
}
