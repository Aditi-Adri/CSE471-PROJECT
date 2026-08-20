import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { MyCouponsList } from "@/components/coupons/MyCouponsList";

// MODULE 4 (Shiva): "My coupons" — open to any signed-in role, since
// any account (customer or worker) can check out in the spare parts
// shop — see app/shop/cart's "any signed-in account can check out".
export const metadata: Metadata = { title: "My coupons" };

export default async function MyCouponsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/coupons");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My coupons</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Codes you can apply at checkout in the spare parts shop.
      </p>
      <MyCouponsList />
    </div>
  );
}
