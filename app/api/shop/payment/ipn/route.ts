import { NextRequest, NextResponse } from "next/server";
import { confirmOrderPayment } from "@/lib/payments/confirmOrderPayment";

/**
 * MODULE 3 (Shiva): SSLCommerz's server-to-server Instant Payment
 * Notification — a second, more reliable confirmation path alongside
 * the success-redirect (app/api/shop/payment/success), for exactly
 * the case that redirect can't cover: the customer closes the tab
 * before the browser makes it back to us. No UI, no redirect — just
 * a 200 so SSLCommerz knows it was received.
 *
 * Note for local dev: SSLCommerz's servers can't reach
 * http://localhost, so this never actually fires outside a deployed/
 * tunnelled environment — the success-redirect path above is what
 * confirms payment when running locally. Harmless either way, since
 * confirmOrderPayment is idempotent.
 */
export async function POST(req: NextRequest) {
  // See the same guard in .../success/route.ts.
  const form = await req.formData().catch(() => null);
  const tranId = String(form?.get("tran_id") ?? "");
  const valId = String(form?.get("val_id") ?? "");

  if (tranId && valId) await confirmOrderPayment(tranId, valId);

  return NextResponse.json({ received: true });
}
