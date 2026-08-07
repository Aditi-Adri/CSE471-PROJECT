import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

describe("hashPassword / verifyPassword", () => {
  it("round-trips: the original password verifies against its own hash", async () => {
    const hash = await hashPassword("Correct-Horse-1");
    await expect(verifyPassword("Correct-Horse-1", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password against the hash", async () => {
    const hash = await hashPassword("Correct-Horse-1");
    await expect(verifyPassword("wrong-password-1", hash)).resolves.toBe(false);
  });

  it("never stores the password in plain text", async () => {
    const hash = await hashPassword("Correct-Horse-1");
    expect(hash).not.toBe("Correct-Horse-1");
    expect(hash).not.toContain("Correct-Horse-1");
  });

  it("salts each hash differently, even for the same password", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password-1"), hashPassword("same-password-1")]);
    expect(a).not.toBe(b);
  });
});
