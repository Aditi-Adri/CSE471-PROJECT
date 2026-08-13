// FEATURE: Spare Parts Store — shared cart state across /shop and /shop/cart

import { CartProvider } from "@/components/shop/CartProvider";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
