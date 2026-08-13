import { describe, expect, it } from "vitest";
import {
  avgAfterWeightAddition,
  avgAfterWeightRemoval,
  getEffectiveAvgWeightLbs,
  resolveMoveWeightLbs,
} from "@/lib/inventory/lot-weight";

describe("getEffectiveAvgWeightLbs", () => {
  it("prefers current over received average", () => {
    expect(
      getEffectiveAvgWeightLbs({
        current_avg_weight_lbs: 620,
        avg_weight_lbs: 580,
        received_weight_lbs: 5000,
        starting_head: 10,
      }),
    ).toBe(620);
  });
});

describe("avgAfterWeightRemoval", () => {
  it("keeps average when deaths remove at average weight", () => {
    expect(avgAfterWeightRemoval(100, 600, 2, 1200)).toBe(600);
  });

  it("lowers average when outweight is heavier than lot average", () => {
    expect(avgAfterWeightRemoval(100, 600, 10, 7000)).toBeCloseTo((60000 - 7000) / 90);
  });
});

describe("avgAfterWeightAddition", () => {
  it("blends incoming weight on partial move in", () => {
    expect(avgAfterWeightAddition(50, 500, 10, 6000)).toBe((25000 + 6000) / 60);
  });
});

describe("resolveMoveWeightLbs", () => {
  it("uses explicit outweight when provided", () => {
    expect(resolveMoveWeightLbs(10, 6500, 600)).toBe(6500);
  });

  it("falls back to average × head", () => {
    expect(resolveMoveWeightLbs(10, null, 600)).toBe(6000);
  });
});
