import { prisma } from "@/lib/db";
import { validateSslcommerzTransaction } from "./sslcommerz";

/**
 * MODULE 3 (Shiva): shared by both the success-redirect callback and
 * the IPN callback (app/api/shop/payment/success, .../ipn) — either
 * one might land first, or (on localhost, where SSLCommerz's servers
 * can't reach our IPN url at all) only the browser redirect ever
 * fires. Idempotent either way: a second confirmation on an
 * already-PAID order is just a no-op success.
 *
 * Never trusts the redirect alone — `val_id` is only meaningful once
 * SSLCommerz's own validation API confirms it server-side, and the
 * amount charged is checked against what this order actually totals,
 * not just accepted on faith.
 */
export async function confirmOrderPayment(tranId: string, valId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { tranId } });
  if (!order) return false;
  if (order.paymentStatus === "PAID") return true;

  const validation = await validateSslcommerzTransaction(valId);
  if (!validation || validation.tranId !== tranId) return false;

  if (Math.abs(validation.amountBdt - Number(order.totalAmount)) > 0.01) {
    console.error(
      `SSLCommerz amount mismatch for order ${order.id}: expected ${order.totalAmount}, got ${validation.amountBdt}`
    );
    return false;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", valId, cardType: validation.cardType, paidAt: new Date() },
  });
  return true;
}
