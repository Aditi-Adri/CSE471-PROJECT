import { describe, expect, it } from "vitest";
import { calculateTotal, formatCurrency, generateOtp } from "./bookingFlow";

describe("bookingFlow helpers", () => {
  it("adds an approved extra charge to the base price", () => {
    expect(calculateTotal(1200, 250)).toBe(1450);
  });

  it("formats prices in BDT", () => {
    expect(formatCurrency(1450)).toBe("৳1,450");
  });

  it("creates a 4-digit arrival code", () => {
    const otp = generateOtp();
    expect(/^\d{4}$/.test(otp)).toBe(true);
  });
});
