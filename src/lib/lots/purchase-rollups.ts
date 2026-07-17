import { computeAvgWeightIn } from "@/lib/lots/purchase-weights";
import type { LotPurchaseRecord } from "./purchase-types";

export function aggregateLotPurchases(purchases: LotPurchaseRecord[]) {
  const active = purchases.filter((p) => p.head_count > 0);
  if (!active.length) {
    return {
      starting_head: 0,
      pay_weight_lbs: null as number | null,
      received_weight_lbs: null as number | null,
      landed_cost: null as number | null,
      purchase_date: null as string | null,
      arrival_date: null as string | null,
      seller_name: null as string | null,
      source_name: null as string | null,
      purchase_price_per_lb: null as number | null,
      avg_weight_lbs: null as number | null,
    };
  }

  const starting_head = active.reduce((sum, p) => sum + p.head_count, 0);
  const pay_weight_lbs = sumOptional(active.map((p) => p.pay_weight_lbs));
  const received_weight_lbs = sumOptional(active.map((p) => p.received_weight_lbs));
  const landed_cost = sumOptional(active.map((p) => p.landed_cost));

  const sorted = [...active].sort((a, b) => a.purchased_at.localeCompare(b.purchased_at));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  return {
    starting_head,
    pay_weight_lbs,
    received_weight_lbs,
    landed_cost,
    purchase_date: first.purchased_at,
    arrival_date: first.arrival_date ?? first.purchased_at,
    seller_name: latest.seller_name,
    source_name: latest.source_name,
    purchase_price_per_lb: latest.purchase_price_per_lb,
    avg_weight_lbs: computeAvgWeightIn(starting_head, {
      payWeightLbs: pay_weight_lbs,
      receivedWeightLbs: received_weight_lbs,
    }),
  };
}

function sumOptional(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0);
}
