"use client";

import { useEffect, useState } from "react";

// MODULE 4 (Shiva): a user's own referral code, on their /account page.
// Sharing it earns both sides a coupon once someone signs up with it —
// see app/api/auth/register/route.ts + lib/referrals/issueReferralReward.ts.
export function ReferralCard() {
  const [data, setData] = useState<{ referralCode: string; referralCount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/me")
      .then((response) => response.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const referralLink =
    typeof window !== "undefined" ? `${window.location.origin}/register?ref=${data.referralCode}` : "";

  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Refer a friend</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Share your code — when someone signs up with it, you both get a coupon for the spare parts shop.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold tracking-wide text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
          {data.referralCode}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {data.referralCount === 0
          ? "No one has signed up with your code yet."
          : `${data.referralCount} ${data.referralCount === 1 ? "person has" : "people have"} signed up with your code.`}
      </p>
    </div>
  );
}
