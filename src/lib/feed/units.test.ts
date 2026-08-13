import { describe, expect, it } from "vitest";
import {
  convertFeedQuantity,
  defaultFeedEntryUnit,
  feedItemQtyPerOneRationUnit,
  getFeedEntryUnitOptions,
  normalizeFeedUnit,
} from "./units";

describe("normalizeFeedUnit", () => {
  it("normalizes common aliases", () => {
    expect(normalizeFeedUnit("lbs")).toBe("lb");
    expect(normalizeFeedUnit("Tons")).toBe("ton");
  });
});

describe("convertFeedQuantity", () => {
  it("converts pounds to tons", () => {
    expect(convertFeedQuantity(4000, "lb", "ton")).toBe(2);
  });

  it("converts tons to pounds", () => {
    expect(convertFeedQuantity(1.5, "ton", "lb")).toBe(3000);
  });

  it("returns null for incompatible count units", () => {
    expect(convertFeedQuantity(10, "bag", "lb")).toBeNull();
  });
});

describe("defaultFeedEntryUnit", () => {
  it("defaults weight rations to pounds", () => {
    expect(defaultFeedEntryUnit("ton")).toBe("lb");
    expect(defaultFeedEntryUnit("bag")).toBe("bag");
  });
});

describe("getFeedEntryUnitOptions", () => {
  it("offers weight alternatives for ton rations with lb first", () => {
    expect(getFeedEntryUnitOptions("ton")).toEqual(["lb", "ton", "cwt"]);
  });

  it("locks count rations to their unit", () => {
    expect(getFeedEntryUnitOptions("bag")).toEqual(["bag"]);
  });
});

describe("feedItemQtyPerOneRationUnit", () => {
  it("uses amount mode quantities directly in feed item units", () => {
    expect(feedItemQtyPerOneRationUnit(500, null, "ton", "lb")).toBe(500);
  });

  it("converts percent inclusion to feed item weight units", () => {
    // 25% of a 1-ton ration = 0.25 tons = 500 lb when hay is tracked in lb
    expect(feedItemQtyPerOneRationUnit(0.25, 25, "ton", "lb")).toBe(500);
  });

  it("handles percent when ration and feed item share units", () => {
    expect(feedItemQtyPerOneRationUnit(0.25, 25, "ton", "ton")).toBe(0.25);
  });

  it("deduction scenario: 4000 lb fed on ton ration with lb ingredients", () => {
    const perRation = feedItemQtyPerOneRationUnit(14, null, "ton", "lb");
    expect(perRation).toBe(14);
    const rationQty = convertFeedQuantity(4000, "lb", "ton");
    expect(rationQty).toBe(2);
    expect(rationQty! * perRation!).toBe(28);
  });
});
