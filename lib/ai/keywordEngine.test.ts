import { describe, expect, it } from "vitest";
import { classifyWithKeywords, normalizeQuery } from "./keywordEngine";
import { SERVICE_CATEGORIES } from "@/lib/data/serviceCategories";

// Same category/keyword data the app actually seeds into Postgres — see
// lib/data/serviceCategories.ts. Using the real data here (rather than
// only synthetic fixtures) is what proves the spec's example phrases
// classify correctly end to end.
const categories = SERVICE_CATEGORIES.map((c) => ({
  id: c.slug,
  name: c.name,
  keywords: c.keywords,
}));

describe("normalizeQuery", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeQuery("AC is Making Noise!!")).toBe("ac is making noise");
  });

  it("collapses repeated whitespace", () => {
    expect(normalizeQuery("water   tap   leaking")).toBe("water tap leaking");
  });
});

describe("classifyWithKeywords — spec examples", () => {
  it('maps "water tap is leaking in kitchen" to Plumbing', () => {
    const result = classifyWithKeywords("water tap is leaking in kitchen", categories);
    expect(result.best?.categoryName).toBe("Plumbing");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('maps "AC is making noise" to AC & Refrigeration Repair', () => {
    const result = classifyWithKeywords("AC is making noise", categories);
    expect(result.best?.categoryName).toBe("AC & Refrigeration Repair");
  });

  it("maps a gas stove complaint to Gas Line & Stove Repair", () => {
    const result = classifyWithKeywords("my gas stove burner won't light", categories);
    expect(result.best?.categoryName).toBe("Gas Line & Stove Repair");
  });

  it("maps a CCTV request to CCTV & Security Installation", () => {
    const result = classifyWithKeywords("I want to install a cctv camera at my gate", categories);
    expect(result.best?.categoryName).toBe("CCTV & Security Installation");
  });
});

describe("classifyWithKeywords — edge cases", () => {
  it("returns no match for an empty/whitespace-only query", () => {
    const result = classifyWithKeywords("   ", categories);
    expect(result.best).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("returns no match when nothing plausible is in the text", () => {
    const result = classifyWithKeywords("xyzabc qwerty unrelated words", categories);
    expect(result.best).toBeNull();
  });

  it("does not false-positive-match a keyword hiding inside an unrelated word", () => {
    // "tap" (Plumbing keyword) must not match inside "adaptation".
    const result = classifyWithKeywords("we are discussing adaptation strategies", categories);
    expect(result.ranked.find((r) => r.categoryName === "Plumbing")).toBeUndefined();
  });
});

describe("classifyWithKeywords — weighting", () => {
  it("prefers a multi-word phrase match over a single lone-word match", () => {
    const synthetic = [
      { id: "a", name: "Category A", keywords: ["fix"] },
      { id: "b", name: "Category B", keywords: ["water tap"] },
    ];
    const result = classifyWithKeywords("please fix my water tap", synthetic);
    expect(result.best?.categoryName).toBe("Category B");
  });

  it("gives a low-margin tie between two categories a lower confidence than a clean win", () => {
    const closeCall = classifyWithKeywords("clean and paint the sofa", [
      { id: "clean", name: "Home Cleaning", keywords: ["clean"] },
      { id: "paint", name: "Painting", keywords: ["paint"] },
    ]);
    const cleanWin = classifyWithKeywords("clean the sofa please", [
      { id: "clean", name: "Home Cleaning", keywords: ["clean"] },
      { id: "paint", name: "Painting", keywords: ["paint"] },
    ]);
    expect(closeCall.confidence).toBeLessThan(cleanWin.confidence);
  });
});
