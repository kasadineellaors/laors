import { describe, expect, it } from "vitest";
import { resolveBillingRateMode } from "@/lib/locations/billing-mode";

describe("resolveBillingRateMode", () => {
  it("uses location override when set", () => {
    expect(
      resolveBillingRateMode(
        { billing_rate_mode: "pasture" },
        { tier: "location", billing_rate_mode: "yardage" },
      ),
    ).toBe("pasture");
    expect(
      resolveBillingRateMode(
        { billing_rate_mode: "yardage" },
        { tier: "location", billing_rate_mode: "pasture" },
      ),
    ).toBe("yardage");
  });

  it("inherits from location type when override is inherit", () => {
    expect(
      resolveBillingRateMode(
        { billing_rate_mode: "inherit" },
        { tier: "location", billing_rate_mode: "pasture" },
      ),
    ).toBe("pasture");
  });

  it("defaults to yardage when unset", () => {
    expect(resolveBillingRateMode(null, null)).toBe("yardage");
    expect(
      resolveBillingRateMode(
        { billing_rate_mode: "inherit" },
        { tier: "location", billing_rate_mode: null },
      ),
    ).toBe("yardage");
  });
});
