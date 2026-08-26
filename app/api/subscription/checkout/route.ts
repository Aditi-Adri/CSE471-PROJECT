import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { initiateSslcommerzPayment, isSslcommerzConfigured } from "@/lib/payments/sslcommerz";
import { activateSubscription } from "@/lib/payments/confirmSubscriptionPayment";
import { getPlan, TRIAL_PLAN, SUBSCRIPTION_PLANS } from "@/lib/constants/subscriptionPlans";
import type { SubscriptionTier } from "@/app/generated/prisma/client";

interface CheckoutRequest {
  tier: SubscriptionTier;
  /** true = redeem the one-time 30-day free Premium trial instead of paying. */
  trial?: boolean;
}

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "WORKER") {
    return Response.json({ error: "Only worker accounts can buy a subscription." }, { status: 403 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true, subscriptionTrialUsed: true },
  });
  if (!worker) {
    return Response.json({ error: "Set up your worker profile first." }, { status: 404 });
  }

  const body: CheckoutRequest = await req.json().catch(() => ({}) as CheckoutRequest);
  const wantsTrial = body.trial === true;

  // Basic is the free default everyone already has — nothing to buy.
  if (!wantsTrial && body.tier === "BASIC") {
    return Response.json({ error: "The Basic plan is free by default — nothing to check out." }, { status: 400 });
  }
  if (!SUBSCRIPTION_PLANS.some((p) => p.tier === body.tier) && !wantsTrial) {
    return Response.json({ error: "Unknown plan selected." }, { status: 400 });
  }
  if (wantsTrial && worker.subscriptionTrialUsed) {
    return Response.json({ error: "You've already used your free trial once." }, { status: 409 });
  }

  const plan = wantsTrial ? TRIAL_PLAN : getPlan(body.tier);
  const amountBdt = wantsTrial ? 0 : plan.priceBdt;

  const willUseGateway = amountBdt > 0 && isSslcommerzConfigured();
  const tranId = `hirelocal-sub-${randomUUID()}`;

  const order = await prisma.subscriptionOrder.create({
    data: {
      workerId: worker.id,
      plan: plan.tier,
      amountBdt,
      isTrial: wantsTrial,
      durationDays: plan.durationDays,
      tranId,
      paymentStatus: willUseGateway ? "PENDING" : "PAID",
      paidAt: willUseGateway ? null : new Date(),
    },
  });

  // Free trial, or the gateway isn't configured for this dev/demo
  // environment — same "graceful fallback" as the shop checkout:
  // activate right away instead of blocking on a payment step.
  if (!willUseGateway) {
    await activateSubscription(order.id, worker.id, plan.tier, plan.durationDays, wantsTrial);
    return Response.json({
      success: true,
      message: wantsTrial ? "Your free 30-day Premium trial is active!" : `${plan.name} plan activated!`,
      paymentUrl: null,
    });
  }

  const origin = process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? new URL(req.url).origin;
  const customer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, address: true },
  });

  const gatewaySession = await initiateSslcommerzPayment({
    tranId,
    totalAmountBdt: amountBdt,
    customerName: customer?.name ?? "HireLocal worker",
    customerEmail: customer?.email ?? "no-reply@hirelocal.test",
    customerPhone: customer?.phone ?? "01700000000",
    customerAddress: customer?.address ?? "Dhaka, Bangladesh",
    productName: `${plan.name} worker subscription (30 days)`,
    successUrl: `${origin}/api/subscription/payment/success`,
    failUrl: `${origin}/api/subscription/payment/fail`,
    cancelUrl: `${origin}/api/subscription/payment/cancel`,
    ipnUrl: `${origin}/api/subscription/payment/ipn`,
  });

  if (!gatewaySession) {
    // Configured but the gateway call itself failed — don't strand a
    // PENDING order the worker has no way to ever pay for.
    console.error(`SSLCommerz session init failed for subscription order ${order.id}; falling back to demo mode.`);
    await activateSubscription(order.id, worker.id, plan.tier, plan.durationDays, wantsTrial);
    return Response.json({ success: true, message: `${plan.name} plan activated!`, paymentUrl: null });
  }

  return Response.json({
    success: true,
    message: "Redirecting to payment gateway",
    paymentUrl: gatewaySession.gatewayUrl,
  });
});
