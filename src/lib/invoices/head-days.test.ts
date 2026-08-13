import { describe, expect, it } from "vitest";
import { integrateHeadDays } from "@/lib/invoices/head-days";

describe("integrateHeadDays", () => {
  it("counts end-of-day head after moves on the same day", () => {
    const deltas = new Map<string, number>([
      ["2025-06-10", -50],
      ["2025-06-12", 30],
    ]);

    const result = integrateHeadDays("2025-06-10", "2025-06-12", 100, deltas);

    // Day 1: 100 - 50 = 50 end of day
    // Day 2: 50
    // Day 3: 50 + 30 = 80
    expect(result.headDays).toBe(180);
    expect(result.headAtEnd).toBe(80);
  });

  it("credits receiving pen on move-in day", () => {
    const deltas = new Map<string, number>([["2025-06-15", 40]]);

    const result = integrateHeadDays("2025-06-15", "2025-06-15", 0, deltas);

    expect(result.headDays).toBe(40);
    expect(result.headAtEnd).toBe(40);
  });
});
