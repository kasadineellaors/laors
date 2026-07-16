import { createClient } from "@/lib/supabase/server";
import type { MonthlyOperationsSummary } from "./types";

function monthBounds(month: string): { start: string; end: string; label: string } {
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  const label = new Date(year, mon - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  return { start, end, label };
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthlyOperationsSummary(
  orgId: string,
  month = currentMonthKey(),
): Promise<MonthlyOperationsSummary> {
  const supabase = await createClient();
  const { start, end, label } = monthBounds(month);

  const [
    { data: sales },
    { data: feedings },
    { data: purchases },
    { data: expenses },
    { data: deaths },
    { data: lots },
  ] = await Promise.all([
    supabase
      .from("sales_records")
      .select("head_count, total_amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("sale_date", start)
      .lte("sale_date", end),
    supabase
      .from("feeding_records")
      .select("quantity, total_feed_cost, feed_ration_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("fed_at", start)
      .lte("fed_at", end),
    supabase
      .from("feed_purchases")
      .select("total_cost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("purchased_at", start)
      .lte("purchased_at", end),
    supabase
      .from("lot_expenses")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("expense_date", start)
      .lte("expense_date", end),
    supabase
      .from("mortality_records")
      .select("head_count")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("died_at", start)
      .lte("died_at", end),
    supabase
      .from("cattle_groups")
      .select("starting_head")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("purchase_date", start)
      .lte("purchase_date", end),
  ]);

  let feedCost = 0;
  let feedQuantity = 0;
  for (const f of feedings ?? []) {
    feedQuantity += Number(f.quantity);
    if (f.total_feed_cost != null) {
      feedCost += Number(f.total_feed_cost);
    }
  }

  const headSold = (sales ?? []).reduce((s, r) => s + (r.head_count ?? 0), 0);
  const saleRevenue = (sales ?? []).reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0,
  );

  return {
    month,
    monthLabel: label,
    headSold,
    saleRevenue: Math.round(saleRevenue * 100) / 100,
    feedDeliveries: feedings?.length ?? 0,
    feedQuantity: Math.round(feedQuantity * 100) / 100,
    feedCost: Math.round(feedCost * 100) / 100,
    commodityPurchases: Math.round(
      (purchases ?? []).reduce((s, p) => s + Number(p.total_cost), 0) * 100,
    ) / 100,
    otherExpenses: Math.round(
      (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0) * 100,
    ) / 100,
    deaths: (deaths ?? []).reduce((s, d) => s + (d.head_count ?? 0), 0),
    lotsReceived: (lots ?? []).reduce((s, l) => s + (l.starting_head ?? 0), 0),
  };
}
