"use client";

// FEATURE: Spare Parts Store — catalogue page
// Workers browse items and add them to the cart. The cart + bill now live on
// their own page (/shop/cart), reachable from the cart button in the header.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/components/shop/CartProvider";
import { formatBdt, type ShopItem, type ShopOrder } from "@/lib/types/shop";

export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addItem, removeItem, quantityOf, totalQuantity, syncStock } = useCart();

  const [items, setItems] = useState<ShopItem[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // FEATURE: Any signed-in account can shop (workers and customers alike)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shop/items");
      if (!res.ok) throw new Error("Failed to load items");
      const data: ShopItem[] = await res.json();
      setItems(data);
      syncStock(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load items from the shop.");
    } finally {
      setLoading(false);
    }
  }, [syncStock]);

  const loadOrderHistory = useCallback(async (workerId: string) => {
    try {
      const res = await fetch(`/api/shop/orders/worker/${workerId}`);
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (err) {
      console.error("Failed to load order history:", err);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadItems();
    if (session?.user?.id) loadOrderHistory(session.user.id);
  }, [status, session?.user?.id, loadItems, loadOrderHistory]);

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-24 dark:bg-zinc-950">
        <p className="animate-pulse text-sm text-zinc-500 dark:text-zinc-400">Loading shop…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* FEATURE: Page header — title on the left, cart button on the right */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Spare Parts
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Pick the parts you need for a job — the bill is added to the job total.
            </p>
          </div>

          <Link
            href="/shop/cart"
            className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
          >
            <CartIcon />
            Cart
            {totalQuantity > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-brand-700">
                {totalQuantity}
              </span>
            )}
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* FEATURE: Item grid — every card is the same height so the Select
            buttons line up across the whole row */}
        <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Available items
        </h2>

        {items.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            No items in the shop right now.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                selected={quantityOf(item.id) > 0}
                onToggle={() =>
                  quantityOf(item.id) > 0 ? removeItem(item.id) : addItem(item)
                }
              />
            ))}
          </div>
        )}

        {/* FEATURE: Recent purchases */}
        {orders.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent purchases
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Items</th>
                      <th className="px-6 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="px-6 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-zinc-700 dark:text-zinc-300">
                          {order.items.map((i) => `${i.itemName} (×${i.quantity})`).join(", ")}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatBdt(order.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// FEATURE: Single product card
// Layout note: `h-full` + `flex-col` on the card and `mt-auto` on the button
// row keeps the Select button pinned to the bottom, so cards with a longer
// description (or a missing stock line) no longer push their button up/down.
function ItemCard({
  item,
  selected,
  onToggle,
}: {
  item: ShopItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const outOfStock = item.stockQty === 0;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-zinc-900 ${
        selected
          ? "border-green-500 dark:border-green-600"
          : "border-zinc-200 hover:border-brand-200 dark:border-zinc-800 dark:hover:border-brand-800"
      }`}
    >
      <div className="flex h-40 items-center justify-center bg-zinc-100 dark:bg-zinc-800">
        {item.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.pictureUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">No image</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{item.name}</h3>
          {item.workType && (
            <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {item.workType}
            </span>
          )}
        </div>

        {/* Fixed two-line description keeps every card's text block the same height */}
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-zinc-600 dark:text-zinc-400">
          {item.useCase}
        </p>

        <p className="mt-3 text-lg font-bold text-brand-600 dark:text-brand-400">
          {formatBdt(item.price)}
        </p>

        {/* Stock line always renders (same height either way) */}
        <p
          className={`mt-1 text-xs font-medium ${
            outOfStock
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {outOfStock ? "Out of stock" : `In stock: ${item.stockQty}`}
        </p>

        {/* mt-auto → every Select button sits on the same line.
            Click toggles selection only — quantities are edited in the cart. */}
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={onToggle}
            disabled={outOfStock}
            aria-pressed={selected}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 ${
              selected ? "bg-green-600 hover:bg-green-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {outOfStock ? "Out of stock" : selected ? "✓ Selected" : "Select"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.5L21 8H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
