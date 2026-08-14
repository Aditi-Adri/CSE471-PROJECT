import { NextRequest, NextResponse } from "next/server";
import { confirmOrderPayment } from "@/lib/payments/confirmOrderPayment";

/**
 * MODULE 3 (Shiva): SSLCommerz redirects the customer's browser here
 * (as a POST, form-encoded) once they complete payment on the hosted
 * gateway page. This is the primary confirmation path — see
 * lib/payments/confirmOrderPayment.ts for why the redirect alone
 * isn't trusted without the validation API call it makes.
 *
 * Always redirects on to the cart page with a `payment` query flag —
 * this endpoint has no UI of its own.
 */
export async function POST(req: NextRequest) {
  // A public, unauthenticated endpoint — malformed input (wrong
  // Content-Type, no body) should fail gracefully into "unconfirmed",
  // not throw. Real SSLCommerz callbacks always send proper
  // form-encoded data; this guards against everything else that can
  // hit a public URL.
  const form = await req.formData().catch(() => null);
  const tranId = String(form?.get("tran_id") ?? "");
  const valId = String(form?.get("val_id") ?? "");

  const confirmed = tranId && valId ? await confirmOrderPayment(tranId, valId) : false;

  const redirectUrl = new URL("/shop/cart", req.url);
  redirectUrl.searchParams.set("payment", confirmed ? "success" : "unconfirmed");
  // 303, not the default 307 — this is a POST handler; the redirect
  // target should be fetched with GET, not re-POSTed.
  return NextResponse.redirect(redirectUrl, 303);
}
