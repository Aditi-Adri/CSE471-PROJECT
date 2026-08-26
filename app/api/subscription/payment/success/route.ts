import { NextRequest, NextResponse } from "next/server";
import { confirmSubscriptionPayment } from "@/lib/payments/confirmSubscriptionPayment";

/**
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * Subscription twin of app/api/shop/payment/success/route.ts —
 * SSLCommerz redirects the worker's browser here (POST, form-encoded)
 * once they complete payment on the hosted gateway page. See
 * lib/payments/confirmSubscriptionPayment.ts for why the redirect
 * alone isn't trusted without the validation API call it makes.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const tranId = String(form?.get("tran_id") ?? "");
  const valId = String(form?.get("val_id") ?? "");

  const confirmed = tranId && valId ? await confirmSubscriptionPayment(tranId, valId) : false;

  const redirectUrl = new URL("/dashboard/worker/subscription", req.url);
  redirectUrl.searchParams.set("payment", confirmed ? "success" : "unconfirmed");
  return NextResponse.redirect(redirectUrl, 303);
}
