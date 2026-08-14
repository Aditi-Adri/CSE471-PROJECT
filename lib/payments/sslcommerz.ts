/**
 * MODULE 3 (Shiva): SSLCommerz sandbox payment integration.
 *
 * Same "free API, optional, graceful fallback" shape as
 * lib/ai/groqClient.ts: every call here is wrapped in a timeout and
 * never throws — on any failure (missing credentials, network error,
 * a bad response) it resolves to `null` and the caller
 * (app/api/shop/orders/route.ts) falls back to completing the order
 * without a real payment step, same as the checkout worked before
 * this existed. Nothing about the shop breaks for a teammate who
 * hasn't set up SSLCOMMERZ_STORE_ID/SSLCOMMERZ_STORE_PASSWORD.
 *
 * SSLCommerz is genuinely free to test end-to-end — their sandbox
 * signup (https://developer.sslcommerz.com/registration/) takes an
 * email, no business verification, no card, and gives you a real
 * Store ID + Store Password immediately. Sandbox test cards (no real
 * money moves): VISA 4111 1111 1111 1111, any future expiry, CVV 111.
 *
 * Deliberately hardcoded to the sandbox host, not a live/sandbox
 * toggle — this is a student project's demo integration, not
 * something that should ever be one env var away from moving real
 * money. Switching to the live gateway (securepay.sslcommerz.com)
 * would be a deliberate code change, not a config flip.
 */

const SANDBOX_BASE_URL = "https://sandbox.sslcommerz.com";
const DEFAULT_TIMEOUT_MS = 8000;

function getCredentials(): { storeId: string; storePassword: string } | null {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  if (!storeId || !storePassword) return null;
  return { storeId, storePassword };
}

export function isSslcommerzConfigured(): boolean {
  return getCredentials() !== null;
}

export type InitiatePaymentInput = {
  /** Our own unique transaction id — SSLCommerz just echoes it back on every callback. */
  tranId: string;
  totalAmountBdt: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
};

export type InitiatePaymentResult = {
  gatewayUrl: string;
  sessionKey: string;
};

/** POST /gwprocess/v4/api.php — opens a payment session, returns the hosted checkout page URL to redirect the browser to. */
export async function initiateSslcommerzPayment(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResult | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({
      store_id: credentials.storeId,
      store_passwd: credentials.storePassword,
      total_amount: input.totalAmountBdt.toFixed(2),
      currency: "BDT",
      tran_id: input.tranId,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      cancel_url: input.cancelUrl,
      ipn_url: input.ipnUrl,
      cus_name: input.customerName,
      cus_email: input.customerEmail,
      cus_phone: input.customerPhone,
      cus_add1: input.customerAddress,
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      num_of_item: "1",
      product_name: input.productName,
      product_category: "Spare Parts",
      product_profile: "physical-goods",
    });

    const response = await fetch(`${SANDBOX_BASE_URL}/gwprocess/v4/api.php`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    if (payload?.status !== "SUCCESS" || !payload?.GatewayPageURL) {
      console.error("SSLCommerz session init failed:", payload?.failedreason ?? payload);
      return null;
    }

    return { gatewayUrl: payload.GatewayPageURL, sessionKey: payload.sessionkey };
  } catch (err) {
    console.error("SSLCommerz session init error:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type ValidationResult = {
  status: string;
  tranId: string;
  amountBdt: number;
  cardType: string | null;
};

/**
 * GET /validator/api/validationserverAPI.php — the server-to-server
 * check that actually confirms a payment. The browser redirect to
 * success_url is never trusted on its own (a client could forge that
 * request); this is what app/api/shop/payment/success and .../ipn
 * both call before ever marking an Order PAID.
 */
export async function validateSslcommerzTransaction(valId: string): Promise<ValidationResult | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const query = new URLSearchParams({
      val_id: valId,
      store_id: credentials.storeId,
      store_passwd: credentials.storePassword,
      format: "json",
    });

    const response = await fetch(
      `${SANDBOX_BASE_URL}/validator/api/validationserverAPI.php?${query.toString()}`,
      { signal: controller.signal }
    );
    if (!response.ok) return null;

    const payload = await response.json();
    if (payload?.status !== "VALID" && payload?.status !== "VALIDATED") return null;

    return {
      status: payload.status,
      tranId: payload.tran_id,
      amountBdt: Number(payload.amount),
      cardType: payload.card_type ?? null,
    };
  } catch (err) {
    console.error("SSLCommerz validation error:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
