import { NextRequest, NextResponse } from "next/server";
import { restoreOrderStock } from "@/lib/payments/restoreOrderStock";

/** MODULE 3 (Shiva): SSLCommerz redirects here (POST, form-encoded) when the customer cancels on the gateway page. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "");
  if (tranId) await restoreOrderStock(tranId, "CANCELLED");

  const redirectUrl = new URL("/shop/cart", req.url);
  redirectUrl.searchParams.set("payment", "cancelled");
  return NextResponse.redirect(redirectUrl, 303);
}
