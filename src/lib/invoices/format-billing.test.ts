import { describe, expect, it } from "vitest";
import {
  describeInvoiceLine,
  formatBillingPeriodLabel,
  parseBillingPeriod,
} from "@/lib/invoices/format-billing";

describe("parseBillingPeriod", () => {
  it("reads period from invoice notes", () => {
    expect(
      parseBillingPeriod("Billing period 2026-07-01 through 2026-07-31"),
    ).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });
});

describe("formatBillingPeriodLabel", () => {
  it("formats a date range", () => {
    expect(formatBillingPeriodLabel("2026-07-01", "2026-07-31")).toContain("Jul");
  });
});

describe("describeInvoiceLine", () => {
  it("explains yardage math", () => {
    const text = describeInvoiceLine({
      description: "Yardage — July 2026",
      quantity: 1200,
      unit_price: 0.85,
      line_total: 1020,
      category: "yardage",
    });
    expect(text).toContain("head-days");
    expect(text).toContain("$0.85");
  });

  it("explains feed tons per ration", () => {
    const text = describeInvoiceLine({
      description: "Feed — Grower ration — 12.4 tons",
      quantity: 12.4,
      unit_price: 280,
      line_total: 3472,
      category: "feed",
    });
    expect(text).toContain("Grower ration");
    expect(text).toContain("12.4");
    expect(text).toContain("$280");
    expect(text).toContain("$3,472");
  });
});
