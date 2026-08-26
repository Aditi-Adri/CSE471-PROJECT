import { NextRequest, NextResponse } from "next/server";
import { failSubscriptionOrder } from "@/lib/payments/failSubscriptionOrder";

/** MODULE 3 -> Worker Subscription & Working Radius: SSLCommerz redirects here (POST, form-encoded) when a payment attempt fails. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const tranId = String(form?.get("tran_id") ?? "");
  if (tranId) await failSubscriptionOrder(tranId, "FAILED");

  const redirectUrl = new URL("/dashboard/worker/subscription", req.url);
  redirectUrl.searchParams.set("payment", "failed");
  return NextResponse.redirect(redirectUrl, 303);
}
