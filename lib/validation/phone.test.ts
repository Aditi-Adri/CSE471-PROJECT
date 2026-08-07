import { describe, expect, it } from "vitest";
import { optionalPhoneSchema, requiredPhoneSchema } from "./phone";

describe("optionalPhoneSchema", () => {
  it("accepts a plain digits phone number", () => {
    expect(optionalPhoneSchema.safeParse("+8801712345678").success).toBe(true);
  });

  it("strips spaces and dashes before validating", () => {
    const result = optionalPhoneSchema.safeParse("+880 171-234-5678");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+8801712345678");
  });

  it("strips parentheses too", () => {
    const result = optionalPhoneSchema.safeParse("(880) 1712345678");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("8801712345678");
  });

  it("accepts an empty string (optional field)", () => {
    expect(optionalPhoneSchema.safeParse("").success).toBe(true);
  });

  it("still rejects letters or too-short input", () => {
    expect(optionalPhoneSchema.safeParse("call-me-maybe").success).toBe(false);
    expect(optionalPhoneSchema.safeParse("123").success).toBe(false);
  });
});

describe("requiredPhoneSchema", () => {
  it("rejects an empty string", () => {
    expect(requiredPhoneSchema.safeParse("").success).toBe(false);
  });

  it("normalizes formatting the same way as the optional variant", () => {
    const result = requiredPhoneSchema.safeParse("+880 171 234 5678");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+8801712345678");
  });
});
