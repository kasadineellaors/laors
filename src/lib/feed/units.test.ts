import { describe, expect, it } from "vitest";
import {
  convertFeedQuantity,
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

describe("getFeedEntryUnitOptions", () => {
  it("offers weight alternatives for ton rations", () => {
    expect(getFeedEntryUnitOptions("ton")).toEqual(["ton", "lb", "cwt"]);
  });

  it("locks count rations to their unit", () => {
    expect(getFeedEntryUnitOptions("bag")).toEqual(["bag"]);
  });
});
