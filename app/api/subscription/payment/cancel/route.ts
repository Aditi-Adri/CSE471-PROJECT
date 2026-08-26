import { NextRequest, NextResponse } from "next/server";
import { failSubscriptionOrder } from "@/lib/payments/failSubscriptionOrder";

/** MODULE 3 -> Worker Subscription & Working Radius: SSLCommerz redirects here (POST, form-encoded) when the worker cancels on the gateway page. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const tranId = String(form?.get("tran_id") ?? "");
  if (tranId) await failSubscriptionOrder(tranId, "CANCELLED");

  const redirectUrl = new URL("/dashboard/worker/subscription", req.url);
  redirectUrl.searchParams.set("payment", "cancelled");
  return NextResponse.redirect(redirectUrl, 303);
}
