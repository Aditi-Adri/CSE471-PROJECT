import { describe, expect, it } from "vitest";
import {
  canRequestTier2,
  canSubmitTier1,
  canSubmitTier3,
  highestApprovedTier,
  type WorkerTierSnapshot,
} from "./tierGating";

const NONE: WorkerTierSnapshot = { tier1: null, tier2: null, tier3: null };

describe("canSubmitTier1", () => {
  it("allows submitting when nothing has been submitted yet", () => {
    expect(canSubmitTier1(NONE)).toBe(true);
  });

  it("allows resubmitting after a rejection", () => {
    expect(canSubmitTier1({ ...NONE, tier1: "REJECTED" })).toBe(true);
  });

  it("blocks while pending review", () => {
    expect(canSubmitTier1({ ...NONE, tier1: "PENDING" })).toBe(false);
  });

  it("blocks once already approved", () => {
    expect(canSubmitTier1({ ...NONE, tier1: "APPROVED" })).toBe(false);
  });
});

describe("canRequestTier2", () => {
  it("blocks until tier 1 is approved", () => {
    expect(canRequestTier2({ ...NONE, tier1: "PENDING" })).toBe(false);
    expect(canRequestTier2({ ...NONE, tier1: null })).toBe(false);
  });

  it("allows requesting once tier 1 is approved and tier 2 hasn't started", () => {
    expect(canRequestTier2({ ...NONE, tier1: "APPROVED" })).toBe(true);
  });

  it("blocks a second request while tier 2 is already pending", () => {
    expect(canRequestTier2({ tier1: "APPROVED", tier2: "PENDING", tier3: null })).toBe(false);
  });

  it("allows re-requesting after a tier 2 failure", () => {
    expect(canRequestTier2({ tier1: "APPROVED", tier2: "REJECTED", tier3: null })).toBe(true);
  });
});

describe("canSubmitTier3", () => {
  it("blocks until tier 2 is approved, even if tier 1 is approved", () => {
    expect(canSubmitTier3({ tier1: "APPROVED", tier2: "PENDING", tier3: null })).toBe(false);
  });

  it("allows submitting once tier 2 is approved", () => {
    expect(canSubmitTier3({ tier1: "APPROVED", tier2: "APPROVED", tier3: null })).toBe(true);
  });
});

describe("highestApprovedTier", () => {
  it("returns UNVERIFIED when nothing is approved", () => {
    expect(highestApprovedTier(NONE)).toBe("UNVERIFIED");
  });

  it("returns the highest approved tier, not just the latest submission", () => {
    expect(highestApprovedTier({ tier1: "APPROVED", tier2: "APPROVED", tier3: "PENDING" })).toBe(
      "TIER2_SKILL_TESTED"
    );
  });

  it("returns TIER3 once all three are approved", () => {
    expect(highestApprovedTier({ tier1: "APPROVED", tier2: "APPROVED", tier3: "APPROVED" })).toBe(
      "TIER3_POLICE_CLEARED"
    );
  });
});
