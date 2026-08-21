"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cardClasses,
  errorBannerClasses,
  inputClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
  successBannerClasses,
} from "@/lib/ui/formStyles";
import { firstIssueMessage } from "@/lib/validation/formatZodIssues";
import { CorporateBookingModal } from "@/components/corporate/CorporateBookingModal";

const DHAKA_AREAS = [
  "GULSHAN", "BANANI", "BARIDHARA", "DHANMONDI", "UTTARA", "MIRPUR",
  "MOHAMMADPUR", "BASHUNDHARA", "BADDA", "RAMPURA", "MOTIJHEEL",
  "OLD_DHAKA", "WARI", "LALMATIA", "FARMGATE", "TEJGAON", "KHILGAON",
  "MALIBAGH", "JATRABARI", "MOHAKHALI", "BANASREE", "SAVAR",
] as const;

/** Human-readable area label: OLD_DHAKA → "Old Dhaka". */
function formatArea(area: string) {
  return area
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

type CorporatePropertyRow = {
  id: string;
  label: string;
  address: string;
  area: string;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
};

/**
 * MODULE 3 -> FEATURE 3 (Corporate Portal): property list/grid with an
 * inline "Add Property" form and per-property "Request Service" action.
 */
export function CorporatePropertyList({ onBookingCreated }: { onBookingCreated?: () => void }) {
  const [properties, setProperties] = useState<CorporatePropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [bookingPropertyId, setBookingPropertyId] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corporate/properties");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load properties.");
      setProperties(data.properties);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Properties</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className={secondaryButtonClasses}
        >
          {showAdd ? "Cancel" : "+ Add Property"}
        </button>
      </div>

      {showAdd && (
        <AddPropertyForm
          onAdded={() => { setShowAdd(false); fetchProperties(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {error && <p className={errorBannerClasses}>{error}</p>}

      {loading && !error && (
        <p className="py-8 text-center text-sm text-zinc-400">Loading properties…</p>
      )}

      {!loading && properties.length === 0 && !error && (
        <div className={cardClasses}>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            No properties registered yet. Click <strong>+ Add Property</strong> to get started.
          </p>
        </div>
      )}

      {properties.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {properties.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-md hover:shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    <BuildingIcon className="h-5 w-5" />
                  </span>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{p.label}</h3>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{p.address}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {formatArea(p.area)}
                  </span>
                  {p.contactName && (
                    <span>
                      Contact: {p.contactName}
                      {p.contactPhone ? ` (${p.contactPhone})` : ""}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingPropertyId(p.id)}
                className="mt-4 inline-flex items-center justify-center self-start rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                Request Service
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Corporate booking modal, opened per-property */}
      {bookingPropertyId && (
        <CorporateBookingModal
          propertyId={bookingPropertyId}
          property={properties.find((p) => p.id === bookingPropertyId)!}
          onClose={() => setBookingPropertyId(null)}
          onSuccess={onBookingCreated}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Property inline form                                          */
/* ------------------------------------------------------------------ */

function AddPropertyForm({
  onAdded,
  onCancel,
}: {
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/corporate/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          address: address.trim(),
          area,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(firstIssueMessage(data.issues, data.error ?? "Failed to add property."));
        return;
      }
      setSuccess(true);
      setTimeout(onAdded, 500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`${cardClasses} mb-6`}>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Add a new property</h3>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {error && <p className={errorBannerClasses}>{error}</p>}
        {success && <p className={successBannerClasses}>Property added!</p>}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Property name</span>
          <input
            required
            minLength={2}
            maxLength={120}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputClasses}
            placeholder='e.g. "Banani Building"'
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full address</span>
          <textarea
            required
            rows={2}
            minLength={5}
            maxLength={300}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClasses}
            placeholder='e.g. "House 5, Road 12, Block E, Banani, Dhaka 1213"'
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Area</span>
          <select
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={inputClasses}
          >
            <option value="" disabled>
              Select area…
            </option>
            {DHAKA_AREAS.map((a) => (
              <option key={a} value={a}>
                {formatArea(a)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              On-site contact <span className="font-normal text-zinc-400">(optional)</span>
            </span>
            <input
              maxLength={100}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={inputClasses}
              placeholder="Contact person name"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone <span className="font-normal text-zinc-400">(optional)</span>
            </span>
            <input
              type="tel"
              maxLength={20}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={inputClasses}
              placeholder="+8801XXXXXXXXX"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting} className={`${primaryButtonClasses} mt-0`}>
            {isSubmitting ? "Adding…" : "Add Property"}
          </button>
          <button type="button" onClick={onCancel} className={secondaryButtonClasses}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icon                                                   */
/* ------------------------------------------------------------------ */

function BuildingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 21V6l8-3 8 3v15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9h2M9 12h2M13 9h2M13 12h2M9 15h6v6H9z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
