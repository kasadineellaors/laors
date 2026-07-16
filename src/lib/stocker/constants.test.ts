import { describe, expect, it } from "vitest";
import {
  COW_CALF_FEEDING_CONTEXT,
  DEFAULT_LOT_ENTERPRISE_TYPE,
  isCowCalfFeedingContext,
  isStockerBillableFeedingContext,
  isStockerLotEnterpriseType,
  STOCKER_BILLING_FEEDING_CONTEXT,
} from "@/lib/stocker/constants";

describe("Stocker billing isolation", () => {
  it("bills only general feeding context", () => {
    expect(isStockerBillableFeedingContext(STOCKER_BILLING_FEEDING_CONTEXT)).toBe(true);
    expect(isStockerBillableFeedingContext(COW_CALF_FEEDING_CONTEXT)).toBe(false);
    expect(isStockerBillableFeedingContext(null)).toBe(false);
  });

  it("identifies cow-calf feed separately", () => {
    expect(isCowCalfFeedingContext(COW_CALF_FEEDING_CONTEXT)).toBe(true);
    expect(isCowCalfFeedingContext(STOCKER_BILLING_FEEDING_CONTEXT)).toBe(false);
  });

  it("defaults lot enterprise type to stocker", () => {
    expect(isStockerLotEnterpriseType(DEFAULT_LOT_ENTERPRISE_TYPE)).toBe(true);
    expect(isStockerLotEnterpriseType("cow_calf")).toBe(false);
    expect(isStockerLotEnterpriseType(null)).toBe(true);
  });
});

describe("hasCowCalfMode guard", () => {
  it("requires explicit cow_calf mode", async () => {
    const { hasCowCalfMode } = await import("@/lib/cow-calf/constants");
    expect(hasCowCalfMode(["stocker"])).toBe(false);
    expect(hasCowCalfMode(["cow_calf", "stocker"])).toBe(true);
    expect(hasCowCalfMode([])).toBe(false);
  });
});
