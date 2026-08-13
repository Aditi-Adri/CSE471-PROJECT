"use client";

// FEATURE: Spare Parts Store — cart state shared between /shop and /shop/cart
// Lives in app/shop/layout.tsx so the cart survives navigation between the
// catalogue and the cart/bill page. Also mirrored into sessionStorage so a
// hard refresh (or opening the cart in a new tab) doesn't lose the basket.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine, ShopItem } from "@/lib/types/shop";
import { lineSubtotal } from "@/lib/types/shop";

const STORAGE_KEY = "hirelocal:shop-cart";

interface CartContextValue {
  lines: CartLine[];
  totalQuantity: number;
  totalBill: number;
  quantityOf: (itemId: number) => number;
  addItem: (item: ShopItem) => void;
  decreaseItem: (itemId: number) => void;
  removeItem: (itemId: number) => void;
  clearCart: () => void;
  /** Re-sync stock caps (and drop vanished items) after the catalogue reloads. */
  syncStock: (items: ShopItem[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Start empty so server and first client render match, then hydrate from
  // sessionStorage in an effect (avoids a hydration mismatch warning).
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable (private mode / quota) — cart still works
      // in memory for the current navigation, so this is safe to ignore.
    }
  }, [lines, hydrated]);

  const addItem = useCallback((item: ShopItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (!existing) {
        if (item.stockQty <= 0) return prev;
        return [
          ...prev,
          {
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            stockQty: item.stockQty,
          },
        ];
      }
      const cap = Math.max(item.stockQty, existing.stockQty);
      if (existing.quantity >= cap) return prev;
      return prev.map((l) =>
        l.itemId === item.id ? { ...l, quantity: l.quantity + 1, stockQty: cap } : l
      );
    });
  }, []);

  const decreaseItem = useCallback((itemId: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.itemId === itemId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((itemId: number) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const syncStock = useCallback((items: ShopItem[]) => {
    const byId = new Map(items.map((i) => [i.id, i]));
    setLines((prev) =>
      prev
        .map((l) => {
          const fresh = byId.get(l.itemId);
          if (!fresh) return null;
          return {
            ...l,
            price: fresh.price,
            name: fresh.name,
            stockQty: fresh.stockQty,
            quantity: Math.min(l.quantity, fresh.stockQty),
          };
        })
        .filter((l): l is CartLine => l !== null && l.quantity > 0)
    );
  }, []);

  const value = useMemo<CartContextValue>(() => {
    return {
      lines,
      totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
      totalBill: lines.reduce((sum, l) => sum + lineSubtotal(l), 0),
      quantityOf: (itemId: number) => lines.find((l) => l.itemId === itemId)?.quantity ?? 0,
      addItem,
      decreaseItem,
      removeItem,
      clearCart,
      syncStock,
    };
  }, [lines, addItem, decreaseItem, removeItem, clearCart, syncStock]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
