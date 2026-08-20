"use client";

import { useEffect, useState } from "react";

type AdminCoupon = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  maxDiscountBdt: number | null;
  minOrderBdt: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  source: "ADMIN" | "REFERRAL";
  createdAt: string;
  _count: { redemptions: number };
  issuedToUser: { name: string; email: string } | null;
};

const inputClasses =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const emptyForm = {
  code: "",
  discountType: "PERCENT" as "PERCENT" | "FIXED",
  value: "",
  maxDiscountBdt: "",
  minOrderBdt: "",
  usageLimit: "",
  perUserLimit: "1",
  expiresAt: "",
};

function isExpired(coupon: AdminCoupon): boolean {
  return Boolean(coupon.expiresAt && new Date(coupon.expiresAt) < new Date());
}

// MODULE 4 (Shiva): admin coupon management — create + deactivate/reactivate.
// Renders on /admin/coupons.
export function CouponManager() {
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadCoupons() {
    fetch("/api/admin/coupons")
      .then((response) => response.json())
      .then((data: { coupons: AdminCoupon[] }) => setCoupons(data.coupons || []))
      .catch(() => setCoupons([]));
  }

  useEffect(loadCoupons, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const body = {
      code: form.code || undefined,
      discountType: form.discountType,
      value: Number(form.value),
      maxDiscountBdt: form.maxDiscountBdt ? Number(form.maxDiscountBdt) : undefined,
      minOrderBdt: form.minOrderBdt ? Number(form.minOrderBdt) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      perUserLimit: Number(form.perUserLimit) || 1,
      expiresAt: form.expiresAt || undefined,
    };

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Failed to create coupon.");
      return;
    }

    setForm(emptyForm);
    loadCoupons();
  }

  async function handleToggleActive(coupon: AdminCoupon) {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    loadCoupons();
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="col-span-full text-lg font-semibold text-zinc-900 dark:text-zinc-50">New coupon</h2>

        {error && <p className="col-span-full text-sm text-red-600 dark:text-red-400">{error}</p>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Code <span className="font-normal text-zinc-400">(optional, auto-generated if blank)</span>
          </span>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className={inputClasses}
            placeholder="SAVE10"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Discount type</span>
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value as "PERCENT" | "FIXED" })}
            className={inputClasses}
          >
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Fixed ৳ off</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Value {form.discountType === "PERCENT" ? "(%)" : "(৳)"}
          </span>
          <input
            required
            type="number"
            min={1}
            max={form.discountType === "PERCENT" ? 100 : undefined}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className={inputClasses}
          />
        </label>

        {form.discountType === "PERCENT" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Max discount (৳) <span className="font-normal text-zinc-400">(optional)</span>
            </span>
            <input
              type="number"
              min={1}
              value={form.maxDiscountBdt}
              onChange={(e) => setForm({ ...form, maxDiscountBdt: e.target.value })}
              className={inputClasses}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Minimum order (৳) <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <input
            type="number"
            min={0}
            value={form.minOrderBdt}
            onChange={(e) => setForm({ ...form, minOrderBdt: e.target.value })}
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Total use limit <span className="font-normal text-zinc-400">(optional, blank = unlimited)</span>
          </span>
          <input
            type="number"
            min={1}
            value={form.usageLimit}
            onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Uses per person</span>
          <input
            required
            type="number"
            min={1}
            value={form.perUserLimit}
            onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Expires <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className={inputClasses}
          />
        </label>

        <div className="col-span-full">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {submitting ? "Creating…" : "Create coupon"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">All coupons</h2>

        {coupons === null && <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}

        {coupons !== null && coupons.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No coupons yet — create one above.</p>
        )}

        {coupons !== null && coupons.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon);
                  return (
                    <tr key={coupon.id} className="bg-white dark:bg-zinc-950">
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                        {coupon.code}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {coupon.discountType === "PERCENT"
                          ? `${coupon.value}%${coupon.maxDiscountBdt ? ` (max ৳${coupon.maxDiscountBdt})` : ""}`
                          : `৳${coupon.value}`}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {coupon._count.redemptions}
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""} · {coupon.perUserLimit}/user
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {coupon.source === "REFERRAL" ? `Referral (${coupon.issuedToUser?.name ?? "—"})` : "Admin"}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            Expired
                          </span>
                        ) : coupon.isActive ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!expired && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(coupon)}
                            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {coupon.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
