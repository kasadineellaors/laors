import { describe, expect, it } from "vitest";
import { weightedAverageBeforeReceipt, weightedAverageCost } from "./costing";

describe("weightedAverageCost", () => {
  it("blends existing inventory with a new receipt", () => {
    expect(weightedAverageCost(10, 100, 10, 200)).toBe(150);
  });
});

describe("weightedAverageBeforeReceipt", () => {
  it("reverses a purchase from current weighted average", () => {
    const after = weightedAverageCost(10, 100, 10, 200);
    const before = weightedAverageBeforeReceipt(20, after, 10, 200);
    expect(before.qtyBefore).toBe(10);
    expect(before.priceBefore).toBe(100);
  });

  it("returns null price when undoing the only receipt", () => {
    const before = weightedAverageBeforeReceipt(5, 120, 5, 120);
    expect(before.qtyBefore).toBe(0);
    expect(before.priceBefore).toBeNull();
  });
});
