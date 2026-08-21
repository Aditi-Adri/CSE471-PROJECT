import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { CouponManager } from "@/components/admin/CouponManager";

export const metadata: Metadata = { title: "Coupon management" };

export default async function AdminCouponsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/coupons");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Coupon management</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Create and deactivate discount codes for the spare parts shop. Referral rewards appear here too, read-only.
      </p>
      <CouponManager />
    </div>
  );
}
