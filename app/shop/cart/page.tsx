"use client";

// FEATURE: Spare Parts Store — Cart & Bill page
// Review selected parts, adjust quantities, see the itemised bill and confirm
// payment. Stock conflicts reported by the API are surfaced inline.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useCart } from "@/components/shop/CartProvider";
import { formatBdt, lineSubtotal, type ShopItem } from "@/lib/types/shop";

// MODULE 3 (Shiva): what the customer lands back to after the real
// SSLCommerz gateway (app/api/shop/payment/success|fail|cancel), read
// from the ?payment= query param those redirects set.
type PaymentReturnState = "success" | "failed" | "cancelled" | "unconfirmed" | null;

// useSearchParams() requires a Suspense boundary above it (it opts
// the tree under it out of static rendering) — this wrapper is that
// boundary; CartPageContent below has the actual page.
export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-24 dark:bg-zinc-950">
          <p className="animate-pulse text-sm text-zinc-500 dark:text-zinc-400">Loading cart…</p>
        </div>
      }
    >
      <CartPageContent />
    </Suspense>
  );
}

function CartPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lines, totalQuantity, totalBill, addItem, decreaseItem, removeItem, clearCart, syncStock } =
    useCart();

  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ id: number; total: number; discountBdt: number } | null>(
    null
  );
  const [paymentReturn] = useState<PaymentReturnState>(
    () => searchParams.get("payment") as PaymentReturnState
  );

  // MODULE 4 (Shiva): coupon applied at checkout — see
  // app/api/coupons/validate and app/api/shop/orders (which
  // re-validates this from scratch; nothing here is trusted as-is).
  // `validatedTotalBdt` is what the discount was actually computed
  // against, so editing the cart afterwards can be flagged as stale
  // instead of silently showing a now-wrong number.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountBdt: number;
    validatedTotalBdt: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), orderTotalBdt: totalBill }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        setCouponError(data.message || data.error || "That coupon isn't valid.");
        return;
      }
      setAppliedCoupon({ code: data.code, discountBdt: data.discountBdt, validatedTotalBdt: totalBill });
    } catch {
      setCouponError("Couldn't check that coupon — try again.");
    } finally {
      setCheckingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  const couponStale = appliedCoupon != null && appliedCoupon.validatedTotalBdt !== totalBill;
  const discountBdt = appliedCoupon && !couponStale ? appliedCoupon.discountBdt : 0;
  const finalTotal = Math.max(0, totalBill - discountBdt);

  // FEATURE: Any signed-in account can check out
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const refreshStock = async () => {
    try {
      const res = await fetch("/api/shop/items");
      if (!res.ok) return;
      const data: ShopItem[] = await res.json();
      syncStock(data);
    } catch (err) {
      console.error("Failed to refresh stock:", err);
    }
  };

  // FEATURE: Confirm payment — POST /api/shop/orders
  const handleConfirmPayment = async () => {
    if (lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    try {
      setConfirming(true);
      setError("");
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: session?.user?.id,
          items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Stock changed under us, or the coupon stopped being valid
        // between the preview and now — show the API's message and
        // re-sync caps either way.
        setError(data.error || "Failed to confirm the order.");
        if (data.couponReason) {
          setAppliedCoupon(null);
        }
        await refreshStock();
        return;
      }

      clearCart();
      handleRemoveCoupon();

      // MODULE 3 (Shiva): a real payment session was opened — send the
      // browser to SSLCommerz's hosted checkout page. The order is
      // already created (PENDING), so this leaves the page entirely;
      // it comes back via one of the /api/shop/payment/* redirects.
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      // No gateway configured (SSLCOMMERZ_STORE_ID/PASSWORD unset) —
      // same as before this existed, the order is just marked paid.
      setPlacedOrder({ id: data.orderId, total: Number(data.totalAmount), discountBdt: data.discountBdt ?? 0 });
    } catch (err) {
      console.error(err);
      setError("Something went wrong while confirming the order.");
    } finally {
      setConfirming(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-24 dark:bg-zinc-950">
        <p className="animate-pulse text-sm text-zinc-500 dark:text-zinc-400">Loading cart…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/shop"
              className="text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              ← Back to spare parts
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Cart &amp; Bill
            </h1>
          </div>
          {totalQuantity > 0 && (
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {totalQuantity} item{totalQuantity === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* MODULE 3 (Shiva): landed back from the real SSLCommerz gateway. */}
        {paymentReturn === "success" && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-900/60 dark:bg-green-950/40">
            <p className="font-semibold text-green-800 dark:text-green-300">✓ Payment confirmed via SSLCommerz</p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Your order has been paid and added to the job bill.
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Buy more parts
            </Link>
          </div>
        )}
        {(paymentReturn === "failed" || paymentReturn === "cancelled" || paymentReturn === "unconfirmed") && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/40">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {paymentReturn === "cancelled" ? "Payment cancelled" : "Payment wasn't completed"}
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Nothing was charged and the reserved stock was released. Add the items again if you&apos;d like to
              retry.
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Back to spare parts
            </Link>
          </div>
        )}

        {/* FEATURE: Order confirmation */}
        {placedOrder && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-900/60 dark:bg-green-950/40">
            <p className="font-semibold text-green-800 dark:text-green-300">
              ✓ Payment confirmed — added to the job bill
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Order #{placedOrder.id} · {formatBdt(placedOrder.total)}
              {placedOrder.discountBdt > 0 && ` (saved ${formatBdt(placedOrder.discountBdt)} with your coupon)`}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Buy more parts
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {lines.length === 0 && !placedOrder ? (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Your cart is empty.</p>
            <Link
              href="/shop"
              className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Browse spare parts
            </Link>
          </div>
        ) : lines.length > 0 ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
            {/* FEATURE: Cart lines */}
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {lines.map((line) => (
                <div key={line.itemId} className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                      {line.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatBdt(line.price)} each · {line.stockQty} in stock
                    </p>
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
                    <button
                      type="button"
                      aria-label={`Decrease ${line.name}`}
                      onClick={() => decreaseItem(line.itemId)}
                      className="h-8 w-8 rounded-md text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${line.name}`}
                      disabled={line.quantity >= line.stockQty}
                      onClick={() =>
                        addItem({
                          id: line.itemId,
                          name: line.name,
                          price: line.price,
                          stockQty: line.stockQty,
                          useCase: "",
                        })
                      }
                      className="h-8 w-8 rounded-md text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-24 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatBdt(lineSubtotal(line))}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(line.itemId)}
                    className="text-sm font-medium text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* FEATURE: Bill summary */}
            <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Bill</h2>

              <dl className="mt-4 space-y-2 text-sm">
                {lines.map((line) => (
                  <div key={line.itemId} className="flex justify-between gap-3">
                    <dt className="truncate text-zinc-600 dark:text-zinc-400">
                      {line.name} × {line.quantity}
                    </dt>
                    <dd className="shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
                      {formatBdt(lineSubtotal(line))}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* MODULE 4 (Shiva): coupon code entry */}
              <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                {appliedCoupon ? (
                  <div
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${couponStale ? "bg-amber-50 dark:bg-amber-950/40" : "bg-green-50 dark:bg-green-950/40"}`}
                  >
                    <span
                      className={`font-medium ${couponStale ? "text-amber-800 dark:text-amber-300" : "text-green-800 dark:text-green-300"}`}
                    >
                      {couponStale
                        ? `Cart changed — recalculate ${appliedCoupon.code}`
                        : `Coupon ${appliedCoupon.code} applied`}
                    </span>
                    <span className="flex shrink-0 gap-3">
                      {couponStale && (
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={checkingCoupon}
                          className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                        >
                          {checkingCoupon ? "Checking…" : "Recalculate"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={checkingCoupon || !couponInput.trim()}
                      className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {checkingCoupon ? "Checking…" : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{couponError}</p>}
              </div>

              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatBdt(totalBill)}</span>
                </div>
                {discountBdt > 0 && (
                  <div className="flex justify-between text-green-700 dark:text-green-400">
                    <span>Discount</span>
                    <span>−{formatBdt(discountBdt)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
                <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                  {formatBdt(finalTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={confirming || lines.length === 0}
                className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
              >
                {confirming ? "Confirming…" : "Confirm payment"}
              </button>

              <button
                type="button"
                onClick={clearCart}
                className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Clear cart
              </button>

              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                The amount is added to the job bill once confirmed.
              </p>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
