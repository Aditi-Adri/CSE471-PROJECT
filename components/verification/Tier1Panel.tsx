"use client";

import { useState } from "react";
import { readFileAsImage, compressImage } from "@/lib/faceMatch/imageUtils";
import { compareFaces, type FaceCompareResult } from "@/lib/faceMatch/compareFaces";
import { errorBannerClasses, inputClasses, primaryButtonClasses, successBannerClasses } from "@/lib/ui/formStyles";
import { TierStatusCard } from "./TierStatusCard";

type Tier1Status = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  autoApproved: boolean;
  reviewNote: string | null;
} | null;

export function Tier1Panel({
  status,
  canSubmit,
  onSubmitted,
}: {
  status: Tier1Status;
  canSubmit: boolean;
  onSubmitted: () => void;
}) {
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<FaceCompareResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function runCompare(nid: File, selfie: File) {
    setComparing(true);
    setCompareError(null);
    setCompareResult(null);
    try {
      const [nidImg, selfieImg] = await Promise.all([readFileAsImage(nid), readFileAsImage(selfie)]);
      setCompareResult(await compareFaces(selfieImg, nidImg));
    } catch {
      setCompareError(
        "Couldn't run the automatic check in this browser — you can still submit for manual review."
      );
    } finally {
      setComparing(false);
    }
  }

  function handleNidChange(file: File | null) {
    setNidFile(file);
    setCompareResult(null);
    if (file && selfieFile) runCompare(file, selfieFile);
  }

  function handleSelfieChange(file: File | null) {
    setSelfieFile(file);
    setCompareResult(null);
    if (file && nidFile) runCompare(nidFile, file);
  }

  async function handleSubmit() {
    if (!nidFile || !selfieFile) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const [nidImg, selfieImg] = await Promise.all([readFileAsImage(nidFile), readFileAsImage(selfieFile)]);
      const nidImage = compressImage(nidImg);
      const selfieImage = compressImage(selfieImg);
      const matchDistance = compareResult?.ok ? compareResult.distance : undefined;

      const response = await fetch("/api/verification/tier1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nidImage, selfieImage, matchDistance }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      onSubmitted();
    } catch {
      setSubmitError("Something went wrong preparing your images. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status && !canSubmit) {
    return (
      <TierStatusCard
        title="Tier 1 · NID Verification"
        status={status.status}
        note={status.reviewNote}
        extra={
          status.status === "APPROVED" && status.autoApproved
            ? "Automatically verified — your selfie matched your NID photo."
            : undefined
        }
      />
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Tier 1 · NID Verification</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Upload a photo of your National ID and a clear selfie — we automatically check they&apos;re the same person.
      </p>

      {status?.status === "REJECTED" && (
        <p className={`mt-3 ${errorBannerClasses}`}>
          Your last submission was rejected{status.reviewNote ? `: ${status.reviewNote}` : "."} Please resubmit.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">NID photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleNidChange(e.target.files?.[0] ?? null)}
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Selfie</span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => handleSelfieChange(e.target.files?.[0] ?? null)}
            className={inputClasses}
          />
        </label>
      </div>

      {comparing && <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Checking your photos…</p>}

      {compareError && <p className={`mt-3 ${errorBannerClasses}`}>{compareError}</p>}

      {compareResult && !comparing && (
        <p
          className={`mt-3 ${
            compareResult.ok && compareResult.autoApproved ? successBannerClasses : errorBannerClasses
          }`}
        >
          {compareResult.ok
            ? compareResult.autoApproved
              ? "Strong match — this will be verified automatically on submit."
              : "We couldn't confidently confirm a match from these photos. You can still submit — a coordinator will review it manually."
            : compareResult.reason === "NO_FACE_IN_SELFIE"
              ? "Couldn't detect a face in the selfie. You can still submit for manual review, or try a clearer photo."
              : "Couldn't detect a face in the NID photo. You can still submit for manual review, or try a clearer photo."}
        </p>
      )}

      {submitError && <p className={`mt-3 ${errorBannerClasses}`}>{submitError}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!nidFile || !selfieFile || submitting || comparing}
        className={`${primaryButtonClasses} mt-4 w-full sm:w-auto`}
      >
        {submitting ? "Submitting…" : "Submit for verification"}
      </button>
    </div>
  );
}
