"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DHAKA_AREAS } from "@/lib/constants/dhakaAreas";
import { cardClasses, errorBannerClasses, inputClasses, primaryButtonClasses } from "@/lib/ui/formStyles";
import type { DhakaArea } from "@/app/generated/prisma/client";

type Category = { id: string; name: string; icon: string };

/**
 * Registration only collects name/email/phone/password/role — a
 * Worker needs headline/bio/rates/categories before there's anything
 * to verify. This is that one-time setup step, shown instead of the
 * verification dashboard until it's done.
 */
export function WorkerProfileForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [area, setArea] = useState<DhakaArea>(DHAKA_AREAS[0].value);
  const [addressDetail, setAddressDetail] = useState("");
  const [hourlyRateMinBdt, setHourlyRateMinBdt] = useState(300);
  const [hourlyRateMaxBdt, setHourlyRateMaxBdt] = useState(800);
  const [yearsExperience, setYearsExperience] = useState(1);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/worker-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline,
        bio,
        area,
        addressDetail,
        hourlyRateMinBdt,
        hourlyRateMaxBdt,
        yearsExperience,
        categoryIds,
      }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/dashboard/verification");
    router.refresh();
  }

  return (
    <div className={`max-w-xl ${cardClasses}`}>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Set up your worker profile</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        This is what customers see, and what verification badges attach to. Takes a minute.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error && <p className={errorBannerClasses}>{error}</p>}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Headline</span>
          <input
            required
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className={inputClasses}
            placeholder='e.g. "Experienced electrician, residential & commercial"'
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">About you</span>
          <textarea
            required
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={inputClasses}
            placeholder="What you do, how long you've done it, what makes you reliable."
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Service categories <span className="font-normal text-zinc-400">(up to 5)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    active
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-300"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  <span aria-hidden="true">{c.icon}</span> {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Area</span>
            <select value={area} onChange={(e) => setArea(e.target.value as DhakaArea)} className={inputClasses}>
              {DHAKA_AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Years of experience</span>
            <input
              type="number"
              min={0}
              max={60}
              required
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              className={inputClasses}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Address / working area detail</span>
          <input
            required
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            className={inputClasses}
            placeholder='e.g. "Road 11, Gulshan 1 — also covers Banani & Baridhara"'
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Min rate (BDT/hr)</span>
            <input
              type="number"
              min={0}
              required
              value={hourlyRateMinBdt}
              onChange={(e) => setHourlyRateMinBdt(Number(e.target.value))}
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Max rate (BDT/hr)</span>
            <input
              type="number"
              min={0}
              required
              value={hourlyRateMaxBdt}
              onChange={(e) => setHourlyRateMaxBdt(Number(e.target.value))}
              className={inputClasses}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || categoryIds.length === 0}
          className={primaryButtonClasses}
        >
          {isSubmitting ? "Creating profile…" : "Create profile & continue to verification"}
        </button>
      </form>
    </div>
  );
}
