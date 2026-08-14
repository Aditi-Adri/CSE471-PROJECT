import { NextRequest, NextResponse } from "next/server";
import { restoreOrderStock } from "@/lib/payments/restoreOrderStock";

/** MODULE 3 (Shiva): SSLCommerz redirects here (POST, form-encoded) when a payment attempt fails. */
export async function POST(req: NextRequest) {
  // See the same guard in .../success/route.ts.
  const form = await req.formData().catch(() => null);
  const tranId = String(form?.get("tran_id") ?? "");
  if (tranId) await restoreOrderStock(tranId, "FAILED");

  const redirectUrl = new URL("/shop/cart", req.url);
  redirectUrl.searchParams.set("payment", "failed");
  return NextResponse.redirect(redirectUrl, 303);
}
