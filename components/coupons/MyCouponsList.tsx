"use client";

import { useEffect, useState } from "react";

type MyCoupon = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  maxDiscountBdt: number | null;
  minOrderBdt: number | null;
  expiresAt: string | null;
  source: "ADMIN" | "REFERRAL";
};

function describeCoupon(coupon: MyCoupon): string {
  const amount = coupon.discountType === "PERCENT" ? `${coupon.value}% off` : `৳${coupon.value} off`;
  const cap = coupon.discountType === "PERCENT" && coupon.maxDiscountBdt ? ` (up to ৳${coupon.maxDiscountBdt})` : "";
  const min = coupon.minOrderBdt ? ` on orders of ৳${coupon.minOrderBdt}+` : "";
  return `${amount}${cap}${min}`;
}

// Shows every coupon this account can still spend, on /dashboard/coupons.
export function MyCouponsList() {
  const [coupons, setCoupons] = useState<MyCoupon[] | null>(null);

  useEffect(() => {
    fetch("/api/coupons/mine")
      .then((response) => response.json())
      .then((data: { coupons: MyCoupon[] }) => setCoupons(data.coupons || []))
      .catch(() => setCoupons([]));
  }, []);

  if (coupons === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (coupons.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No coupons available right now — refer a friend from your account page to earn one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {coupons.map((coupon) => (
        <div
          key={coupon.code}
          className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="min-w-0">
            <code className="text-sm font-semibold tracking-wide text-brand-700 dark:text-brand-400">
              {coupon.code}
            </code>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{describeCoupon(coupon)}</p>
            {coupon.expiresAt && (
              <p className="mt-0.5 text-xs text-zinc-400">
                Expires {new Date(coupon.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {coupon.source === "REFERRAL" && (
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              Referral reward
            </span>
          )}
        </div>
      ))}
      <p className="text-xs text-zinc-400">Apply a code at checkout in the spare parts shop cart.</p>
    </div>
  );
}
