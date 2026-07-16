import { describe, expect, it } from "vitest";
import {
  exposureDurationDays,
  findOverlappingBullExposures,
  pregnancyRateFromResults,
  cowToBullRatio,
} from "./reproduction-helpers";

describe("reproduction-helpers", () => {
  it("calculates exposure duration through today when open-ended", () => {
    const days = exposureDurationDays("2026-05-01", null, "2026-06-01");
    expect(days).toBe(31);
  });

  it("detects overlapping bull exposures", () => {
    const existing: Parameters<typeof findOverlappingBullExposures>[0] = [
      {
        id: "a",
        bullId: "bull-1",
        damId: null,
        exposureStart: "2026-05-01",
        exposureEnd: "2026-07-15",
      },
    ];
    const overlaps = findOverlappingBullExposures(existing, {
      id: "b",
      bullId: "bull-1",
      damId: null,
      exposureStart: "2026-06-01",
      exposureEnd: null,
    });
    expect(overlaps).toHaveLength(1);
  });

  it("calculates cow-to-bull ratio without prescribing advice", () => {
    expect(cowToBullRatio(42, 2)).toBe("21.0:1");
    expect(cowToBullRatio(0, 2)).toBeNull();
  });

  it("calculates pregnancy rate from bred and open only", () => {
    const result = pregnancyRateFromResults({ bred: 35, open: 7, recheck: 2, unknown: 1 });
    expect(result.rate).toBe(83.3);
    expect(result.denominator).toBe(42);
  });

  it("excludes unknown from pregnancy rate denominator", () => {
    const result = pregnancyRateFromResults({ bred: 0, open: 0, recheck: 0, unknown: 5 });
    expect(result.rate).toBeNull();
  });
});
