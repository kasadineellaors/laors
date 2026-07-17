import { describe, expect, it } from "vitest";
import { parseSegmentDigits } from "./date-segments";

describe("parseSegmentDigits", () => {
  it("replaces a fully selected segment when typing", () => {
    expect(parseSegmentDigits("3", 2, "07", 0, 2)).toBe("3");
    expect(parseSegmentDigits("12", 2, "07", 0, 2)).toBe("12");
  });

  it("overwrites a full segment when user types without selecting", () => {
    expect(parseSegmentDigits("071", 2, "07", 2, 2)).toBe("01");
    expect(parseSegmentDigits("20251", 4, "2025", 4, 4)).toBe("2021");
  });

  it("caps length and strips non-digits", () => {
    expect(parseSegmentDigits("1a2b", 2, "", 0, 0)).toBe("12");
  });
});
