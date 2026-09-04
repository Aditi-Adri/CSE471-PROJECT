import { prisma } from "@/lib/db";
import { validateSslcommerzTransaction } from "./sslcommerz";
import { getPlan } from "@/lib/constants/subscriptionPlans";
import type { SubscriptionTier } from "@/app/generated/prisma/client";

/**
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * The subscription twin of lib/payments/confirmOrderPayment.ts — same
 * shape, same reasoning: shared by both the success-redirect and the
 * IPN callback (either one might land first), never trusts the
 * redirect alone (SSLCommerz's own validation API has to confirm it),
 * and is idempotent (a second confirmation on an already-PAID order is
 * just a no-op success).
 *
 * The one thing this adds on top of a shop order: on a first-time
 * confirmation it also activates the plan on the worker's own row
 * (tier + radius + expiry), which is the whole point of a
 * subscription purchase.
 */
export async function confirmSubscriptionPayment(tranId: string, valId: string): Promise<boolean> {
  const order = await prisma.subscriptionOrder.findUnique({ where: { tranId } });
  if (!order) return false;
  if (order.paymentStatus === "PAID") return true;

  const validation = await validateSslcommerzTransaction(valId);
  if (!validation || validation.tranId !== tranId) return false;

  if (Math.abs(validation.amountBdt - order.amountBdt) > 0.01) {
    console.error(
      `SSLCommerz amount mismatch for subscription order ${order.id}: expected ${order.amountBdt}, got ${validation.amountBdt}`
    );
    return false;
  }

  await activateSubscription(order.id, order.workerId, order.plan, order.durationDays, order.isTrial, {
    valId,
    cardType: validation.cardType,
  });
  return true;
}

/**
 * Marks a SubscriptionOrder PAID and applies the plan to the worker.
 * Shared by the real gateway path above and the "no gateway configured
 * / free trial" instant-activate path in the checkout route — both
 * need to do the exact same worker update, just triggered differently.
 *
 * Extends (rather than replaces) an already-active, still-valid expiry
 * instead of always starting the clock from "now" — buying another 30
 * days while 10 days are still left should give 40 days, not reset to 30.
 */
export async function activateSubscription(
  orderId: string,
  workerId: string,
  plan: SubscriptionTier,
  durationDays: number,
  isTrial: boolean,
  gatewayInfo: { valId?: string; cardType?: string | null } = {}
): Promise<void> {
  const planConfig = getPlan(plan);
  const worker = await prisma.worker.findUnique({ where: { id: workerId }, select: { subscriptionExpiresAt: true } });

  const now = new Date();
  const currentExpiry = worker?.subscriptionExpiresAt;
  const stillActive = currentExpiry != null && currentExpiry.getTime() > now.getTime();
  const startFrom = stillActive ? currentExpiry! : now;
  const newExpiresAt = new Date(startFrom.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.subscriptionOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paidAt: now,
        ...(gatewayInfo.valId ? { valId: gatewayInfo.valId, cardType: gatewayInfo.cardType ?? null } : {}),
      },
    }),
    prisma.worker.update({
      where: { id: workerId },
      data: {
        subscriptionTier: plan,
        serviceRadiusKm: planConfig.radiusKm,
        subscriptionExpiresAt: newExpiresAt,
        ...(isTrial ? { subscriptionTrialUsed: true } : {}),
      },
    }),
  ]);
}
