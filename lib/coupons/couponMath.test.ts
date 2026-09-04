import { describe, expect, it } from "vitest";
import { computeDiscountBdt } from "./couponMath";

describe("computeDiscountBdt", () => {
  it("computes a flat FIXED discount", () => {
    expect(computeDiscountBdt({ discountType: "FIXED", value: 150, maxDiscountBdt: null }, 1000)).toBe(150);
  });

  it("computes a PERCENT discount, rounded to the nearest taka", () => {
    // 10% of 999 = 99.9 -> rounds to 100
    expect(computeDiscountBdt({ discountType: "PERCENT", value: 10, maxDiscountBdt: null }, 999)).toBe(100);
  });

  it("caps a PERCENT discount at maxDiscountBdt", () => {
    // 50% of 1000 = 500, but capped at 200
    expect(computeDiscountBdt({ discountType: "PERCENT", value: 50, maxDiscountBdt: 200 }, 1000)).toBe(200);
  });

  it("never caps a FIXED discount, even when its value is well above maxDiscountBdt", () => {
    // A stray maxDiscountBdt on a FIXED coupon (e.g. left over from
    // switching discount types in the admin form) must not silently
    // shrink the flat amount — maxDiscountBdt only means anything for
    // PERCENT. Regression test: this exact case (value > maxDiscountBdt)
    // is the one the previous "does not cap ... under maxDiscountBdt"
    // test didn't cover.
    expect(computeDiscountBdt({ discountType: "FIXED", value: 500, maxDiscountBdt: 100 }, 1000)).toBe(500);
    expect(computeDiscountBdt({ discountType: "FIXED", value: 50, maxDiscountBdt: 200 }, 1000)).toBe(50);
  });

  it("never discounts more than the order total", () => {
    expect(computeDiscountBdt({ discountType: "FIXED", value: 500, maxDiscountBdt: null }, 300)).toBe(300);
    expect(computeDiscountBdt({ discountType: "PERCENT", value: 100, maxDiscountBdt: null }, 300)).toBe(300);
  });

  it("never goes negative, even for a zero-value order", () => {
    expect(computeDiscountBdt({ discountType: "FIXED", value: 50, maxDiscountBdt: null }, 0)).toBe(0);
  });
});
