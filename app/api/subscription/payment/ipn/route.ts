import { NextRequest, NextResponse } from "next/server";
import { confirmSubscriptionPayment } from "@/lib/payments/confirmSubscriptionPayment";

/**
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * Subscription twin of app/api/shop/payment/ipn/route.ts — a second,
 * more reliable confirmation path for exactly the case the
 * success-redirect can't cover (worker closes the tab early). No UI,
 * no redirect, just a 200 so SSLCommerz knows it was received.
 * Harmless to call twice — confirmSubscriptionPayment is idempotent.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const tranId = String(form?.get("tran_id") ?? "");
  const valId = String(form?.get("val_id") ?? "");

  if (tranId && valId) await confirmSubscriptionPayment(tranId, valId);

  return NextResponse.json({ received: true });
}
