import { NextRequest, NextResponse } from "next/server";
import { restoreOrderStock } from "@/lib/payments/restoreOrderStock";

/** MODULE 3 (Shiva): SSLCommerz redirects here (POST, form-encoded) when a payment attempt fails. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "");
  if (tranId) await restoreOrderStock(tranId, "FAILED");

  const redirectUrl = new URL("/shop/cart", req.url);
  redirectUrl.searchParams.set("payment", "failed");
  return NextResponse.redirect(redirectUrl, 303);
}
