import { describe, expect, it } from "vitest";
import { averageWeight, calvingLiveRatePct } from "./report-metrics";

describe("calvingLiveRatePct", () => {
  it("returns null for empty totals", () => {
    expect(calvingLiveRatePct(0, 0)).toBeNull();
  });

  it("computes live percentage", () => {
    expect(calvingLiveRatePct(9, 10)).toBe(90);
    expect(calvingLiveRatePct(1, 3)).toBe(33.3);
  });
});

describe("averageWeight", () => {
  it("returns null when empty", () => {
    expect(averageWeight([])).toBeNull();
  });

  it("averages weights", () => {
    expect(averageWeight([500, 520, 480])).toBe(500);
  });
});
