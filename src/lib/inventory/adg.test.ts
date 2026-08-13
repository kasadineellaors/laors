import { describe, expect, it } from "vitest";
import {
  computeLotAdgLbs,
  computeOperationAdgLbs,
  formatAdgLbs,
} from "@/lib/inventory/adg";

describe("computeLotAdgLbs", () => {
  it("returns lb/day gain from in weight to current", () => {
    expect(
      computeLotAdgLbs({
        weightInLbs: 600,
        currentWeightLbs: 750,
        daysOnFeed: 75,
      }),
    ).toBe(2);
  });

  it("returns null without days on feed", () => {
    expect(
      computeLotAdgLbs({
        weightInLbs: 600,
        currentWeightLbs: 750,
        daysOnFeed: 0,
      }),
    ).toBeNull();
  });
});

describe("computeOperationAdgLbs", () => {
  it("head-weights lot ADGs", () => {
    expect(
      computeOperationAdgLbs([
        { adgLbs: 2, head: 100 },
        { adgLbs: 3, head: 50 },
      ]),
    ).toBeCloseTo((200 + 150) / 150);
  });
});

describe("formatAdgLbs", () => {
  it("shows sign for positive gain", () => {
    expect(formatAdgLbs(2.34)).toBe("+2.3 lb/day");
  });
});
