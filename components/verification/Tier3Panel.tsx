"use client";

import { useState } from "react";
import { readFileAsImage, compressImage } from "@/lib/faceMatch/imageUtils";
import { errorBannerClasses, inputClasses, primaryButtonClasses, secondaryButtonClasses } from "@/lib/ui/formStyles";
import { TierStatusCard } from "./TierStatusCard";

type Reference = { name: string; phone: string; relationship: string };

type Tier3Status = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  references: { id: string; name: string; contacted: boolean; verified: boolean }[];
} | null;

const EMPTY_REFERENCE: Reference = { name: "", phone: "", relationship: "" };

export function Tier3Panel({
  status,
  unlocked,
  canSubmit,
  onSubmitted,
}: {
  status: Tier3Status;
  unlocked: boolean;
  canSubmit: boolean;
  onSubmitted: () => void;
}) {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [references, setReferences] = useState<Reference[]>([{ ...EMPTY_REFERENCE }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!unlocked) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-4 opacity-60 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-500 dark:text-zinc-500">Tier 3 · Police Clearance</h3>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">Pass Tier 2 first to unlock this.</p>
      </div>
    );
  }

  if (status && !canSubmit) {
    return (
      <div className="flex flex-col gap-3">
        <TierStatusCard title="Tier 3 · Police Clearance" status={status.status} note={status.reviewNote} />
        {status.references.length > 0 && (
          <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <p className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">References</p>
            <ul className="flex flex-col gap-1">
              {status.references.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>{r.name}</span>
                  <span>{r.verified ? "✅ Verified" : r.contacted ? "📞 Contacted" : "⏳ Not yet contacted"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  function updateReference(index: number, field: keyof Reference, value: string) {
    setReferences((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addReference() {
    setReferences((prev) => (prev.length >= 3 ? prev : [...prev, { ...EMPTY_REFERENCE }]));
  }

  function removeReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!documentFile) return;
    setSubmitting(true);
    setError(null);
    try {
      const img = await readFileAsImage(documentFile);
      const clearanceDocument = compressImage(img, 1400, 0.85);

      const response = await fetch("/api/verification/tier3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearanceDocument, references }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      onSubmitted();
    } catch {
      setError("Something went wrong preparing your document. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Tier 3 · Police Clearance</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Upload your official police clearance certificate and list 1–3 previous customers as references.
      </p>

      {status?.status === "REJECTED" && (
        <p className={`mt-3 ${errorBannerClasses}`}>
          Your last submission was rejected{status.reviewNote ? `: ${status.reviewNote}` : "."} Please resubmit.
        </p>
      )}

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Police clearance document <span className="font-normal text-zinc-400">(clear photo or scan)</span>
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
          className={inputClasses}
        />
      </label>

      <div className="mt-4 flex flex-col gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">References</span>
        {references.map((ref, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-3 dark:border-zinc-800"
          >
            <input
              value={ref.name}
              onChange={(e) => updateReference(i, "name", e.target.value)}
              className={inputClasses}
              placeholder="Name"
            />
            <input
              value={ref.phone}
              onChange={(e) => updateReference(i, "phone", e.target.value)}
              className={inputClasses}
              placeholder="Phone"
            />
            <div className="flex gap-2">
              <input
                value={ref.relationship}
                onChange={(e) => updateReference(i, "relationship", e.target.value)}
                className={inputClasses}
                placeholder="e.g. Previous customer"
              />
              {references.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeReference(i)}
                  className="shrink-0 text-sm text-red-600 dark:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {references.length < 3 && (
          <button type="button" onClick={addReference} className={`${secondaryButtonClasses} self-start`}>
            + Add another reference
          </button>
        )}
      </div>

      {error && <p className={`mt-3 ${errorBannerClasses}`}>{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!documentFile || submitting}
        className={`${primaryButtonClasses} mt-4 w-full sm:w-auto`}
      >
        {submitting ? "Submitting…" : "Submit for verification"}
      </button>
    </div>
  );
}
