import { describe, expect, it } from "vitest";
import {
  formatPhysicalAddress,
  parsePhysicalAddress,
} from "@/lib/addresses/format";

describe("formatPhysicalAddress", () => {
  it("formats a full address", () => {
    expect(
      formatPhysicalAddress({
        line1: "123 County Road 42",
        line2: "Suite B",
        city: "Amarillo",
        state: "TX",
        zip: "79015",
      }),
    ).toBe("123 County Road 42\nSuite B\nAmarillo, TX 79015");
  });
});

describe("parsePhysicalAddress", () => {
  it("parses city state zip line", () => {
    expect(
      parsePhysicalAddress("123 County Road 42\nAmarillo, TX 79015"),
    ).toEqual({
      line1: "123 County Road 42",
      line2: "",
      city: "Amarillo",
      state: "TX",
      zip: "79015",
    });
  });
});
