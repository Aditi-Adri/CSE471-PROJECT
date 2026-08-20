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

  it("does not cap a FIXED discount that happens to be under maxDiscountBdt", () => {
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
