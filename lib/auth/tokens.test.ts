import { describe, expect, it } from "vitest";
import { generatePasswordResetToken, hashToken } from "./tokens";

describe("hashToken", () => {
  it("is deterministic — the same raw token always hashes the same way", () => {
    expect(hashToken("abc123")).toBe(hashToken("abc123"));
  });

  it("never returns the raw token itself", () => {
    expect(hashToken("abc123")).not.toBe("abc123");
  });
});

describe("generatePasswordResetToken", () => {
  it("returns a raw token whose hash matches hashToken(raw)", () => {
    const { raw, hash } = generatePasswordResetToken();
    expect(hashToken(raw)).toBe(hash);
  });

  it("generates a different raw token (and hash) every call", () => {
    const first = generatePasswordResetToken();
    const second = generatePasswordResetToken();
    expect(first.raw).not.toBe(second.raw);
    expect(first.hash).not.toBe(second.hash);
  });

  it("has enough entropy to not be guessable (256-bit / 64 hex chars)", () => {
    const { raw } = generatePasswordResetToken();
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
  });
});
