import { describe, expect, it } from "vitest";
import {
  getEffectiveStartingHead,
  needsLotRollupRepair,
  resolveLotMetrics,
} from "@/lib/inventory/lot-display";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import type { LotPurchaseRecord } from "@/lib/lots/purchase-types";

function baseGroup(overrides: Partial<CattleGroupSummary> = {}): CattleGroupSummary {
  return {
    id: "g1",
    name: "Lot 1",
    location_id: null,
    location_name: null,
    location_breadcrumb: null,
    total_head: 149,
    counts: [],
    notes: null,
    ownership_group_id: null,
    ownership_group_name: null,
    customer_id: null,
    customer_name: null,
    owner_id: null,
    owner_name: null,
    open_treatment_count: 0,
    feedings_today: 0,
    withdrawal_active: false,
    head_discrepancy: null,
    lot_number: null,
    enterprise_type: "stocker",
    lot_status: "active",
    opened_at: "2026-07-16",
    closed_at: null,
    purchase_date: null,
    arrival_date: null,
    starting_head: null,
    pay_weight_lbs: null,
    shrunk_weight_lbs: null,
    received_weight_lbs: null,
    avg_weight_lbs: null,
    current_avg_weight_lbs: null,
    purchase_price_per_lb: null,
    landed_cost: 438.64,
    seller_name: null,
    source_name: null,
    ...overrides,
  };
}

const purchase: LotPurchaseRecord = {
  id: "p1",
  cattle_group_id: "g1",
  purchased_at: "2026-07-16",
  arrival_date: "2026-07-16",
  seller_name: null,
  source_name: null,
  invoice_ref: null,
  head_count: 149,
  pay_weight_lbs: 89_100,
  received_weight_lbs: 88_500,
  purchase_price_per_lb: null,
  landed_cost: 438.64,
  notes: null,
  created_at: "2026-07-16T12:00:00Z",
};

describe("getEffectiveStartingHead", () => {
  it("falls back to total head when starting head is missing", () => {
    expect(getEffectiveStartingHead(baseGroup())).toBe(149);
  });

  it("uses purchase rollup head when group starting head is missing", () => {
    expect(getEffectiveStartingHead(baseGroup({ total_head: 0 }), [purchase])).toBe(149);
  });
});

describe("resolveLotMetrics", () => {
  it("derives avg weight from purchase receipts", () => {
    const metrics = resolveLotMetrics(baseGroup(), [purchase]);
    expect(metrics.starting_head).toBe(149);
    expect(metrics.avg_weight_lbs).toBeCloseTo(88_500 / 149, 1);
    expect(metrics.current_avg_weight_lbs).toBeCloseTo(88_500 / 149, 1);
  });
});

describe("needsLotRollupRepair", () => {
  it("flags lots with purchases but missing starting head", () => {
    expect(needsLotRollupRepair(baseGroup(), [purchase])).toBe(true);
  });

  it("does not repair when rollups are present", () => {
    expect(
      needsLotRollupRepair(
        baseGroup({ starting_head: 149, avg_weight_lbs: 594 }),
        [purchase],
      ),
    ).toBe(false);
  });
});
