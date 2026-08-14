// FEATURE: Spare Parts Store — shared types for shop pages + cart state

export interface ShopItem {
  id: number;
  name: string;
  pictureUrl?: string | null;
  useCase: string;
  price: string;
  stockQty: number;
  workType?: string | null;
}

/**
 * A line in the cart. `stockQty` is carried along so the cart page can cap the
 * quantity stepper without having to re-fetch the whole catalogue.
 */
export interface CartLine {
  itemId: number;
  name: string;
  price: string;
  quantity: number;
  stockQty: number;
}

export interface ShopOrder {
  id: number;
  date: string;
  totalAmount: string;
  items: Array<{ itemName: string; quantity: number }>;
}

export function lineSubtotal(line: CartLine): number {
  return Number(line.price) * line.quantity;
}

export function formatBdt(amount: number | string): string {
  return `৳${Number(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
