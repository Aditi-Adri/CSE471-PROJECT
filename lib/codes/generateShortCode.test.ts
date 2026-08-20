import { describe, expect, it } from "vitest";
import { generateShortCode } from "./generateShortCode";

describe("generateShortCode", () => {
  it("defaults to 8 characters", () => {
    expect(generateShortCode()).toHaveLength(8);
  });

  it("respects a custom length", () => {
    expect(generateShortCode(4)).toHaveLength(4);
    expect(generateShortCode(12)).toHaveLength(12);
  });

  it("only uses unambiguous uppercase letters and digits", () => {
    const code = generateShortCode(200);
    expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(code).not.toMatch(/[01OIL]/);
  });

  it("is different across calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateShortCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
