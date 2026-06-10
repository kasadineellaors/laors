import { createClient } from "@/lib/supabase/server";

function daysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

async function getGroupCurrentHead(orgId: string, groupId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_inventory_counts")
    .select("head_count")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId);

  return (data ?? []).reduce((s, r) => s + r.head_count, 0);
}

/** Net head change for a group on and after `fromDate` (ISO date). */
async function netHeadChangeSince(
  orgId: string,
  groupId: string,
  fromDate: string,
): Promise<number> {
  const supabase = await createClient();
  const fromTs = `${fromDate}T00:00:00`;

  let net = 0;

  const { data: adjustments } = await supabase
    .from("inventory_adjustments")
    .select("delta, created_at")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .gte("created_at", fromTs);

  net += (adjustments ?? []).reduce((s, r) => s + r.delta, 0);

  const { data: movesOut } = await supabase
    .from("cattle_movements")
    .select("total_head")
    .eq("organization_id", orgId)
    .eq("source_group_id", groupId)
    .eq("status", "completed")
    .gte("moved_at", fromTs);

  net -= (movesOut ?? []).reduce((s, r) => s + r.total_head, 0);

  const { data: movesIn } = await supabase
    .from("cattle_movements")
    .select("total_head")
    .eq("organization_id", orgId)
    .eq("destination_group_id", groupId)
    .eq("status", "completed")
    .gte("moved_at", fromTs);

  net += (movesIn ?? []).reduce((s, r) => s + r.total_head, 0);

  const { data: sales } = await supabase
    .from("sales_records")
    .select("head_count")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("inventory_deducted", true)
    .eq("is_active", true)
    .gte("sale_date", fromDate);

  net -= (sales ?? []).reduce((s, r) => s + r.head_count, 0);

  const { data: calvings } = await supabase
    .from("calving_records")
    .select("id")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("inventory_added", true)
    .eq("is_active", true)
    .gte("calved_at", fromDate);

  net += (calvings ?? []).length;

  return net;
}

/** Daily net deltas within [periodStart, periodEnd] keyed by ISO date. */
async function dailyDeltasInPeriod(
  orgId: string,
  groupId: string,
  periodStart: string,
  periodEnd: string,
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const deltas = new Map<string, number>();
  const add = (date: string, delta: number) => {
    if (date < periodStart || date > periodEnd) return;
    deltas.set(date, (deltas.get(date) ?? 0) + delta);
  };

  const fromTs = `${periodStart}T00:00:00`;
  const toTs = `${periodEnd}T23:59:59`;

  const { data: adjustments } = await supabase
    .from("inventory_adjustments")
    .select("delta, created_at")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .gte("created_at", fromTs)
    .lte("created_at", toTs);

  for (const row of adjustments ?? []) {
    add(row.created_at.slice(0, 10), row.delta);
  }

  const { data: moves } = await supabase
    .from("cattle_movements")
    .select("source_group_id, destination_group_id, total_head, moved_at")
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .gte("moved_at", fromTs)
    .lte("moved_at", toTs)
    .or(`source_group_id.eq.${groupId},destination_group_id.eq.${groupId}`);

  for (const m of moves ?? []) {
    const day = m.moved_at.slice(0, 10);
    if (m.source_group_id === groupId) add(day, -m.total_head);
    if (m.destination_group_id === groupId) add(day, m.total_head);
  }

  const { data: sales } = await supabase
    .from("sales_records")
    .select("head_count, sale_date")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("inventory_deducted", true)
    .eq("is_active", true)
    .gte("sale_date", periodStart)
    .lte("sale_date", periodEnd);

  for (const s of sales ?? []) {
    add(s.sale_date, -s.head_count);
  }

  const { data: calvings } = await supabase
    .from("calving_records")
    .select("calved_at")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("inventory_added", true)
    .eq("is_active", true)
    .gte("calved_at", periodStart)
    .lte("calved_at", periodEnd);

  for (const c of calvings ?? []) {
    add(c.calved_at, 1);
  }

  return deltas;
}

export interface GroupHeadDaysResult {
  groupId: string;
  groupName: string;
  headDays: number;
  avgHead: number;
  headAtStart: number;
  headAtEnd: number;
}

/** Average-daily-head billing: integrate head count across the billing period. */
export async function computeGroupHeadDays(
  orgId: string,
  groupId: string,
  groupName: string,
  periodStart: string,
  periodEnd: string,
): Promise<GroupHeadDaysResult> {
  const dayCount = daysInclusive(periodStart, periodEnd);
  const currentHead = await getGroupCurrentHead(orgId, groupId);
  const changeSincePeriodStart = await netHeadChangeSince(orgId, groupId, periodStart);
  const headAtStart = currentHead - changeSincePeriodStart;

  if (dayCount === 0) {
    return {
      groupId,
      groupName,
      headDays: 0,
      avgHead: 0,
      headAtStart,
      headAtEnd: headAtStart,
    };
  }

  const dailyDeltas = await dailyDeltasInPeriod(orgId, groupId, periodStart, periodEnd);
  let head = headAtStart;
  let headDays = 0;

  for (const day of eachDay(periodStart, periodEnd)) {
    headDays += Math.max(0, head);
    head += dailyDeltas.get(day) ?? 0;
  }

  const avgHead = Math.round((headDays / dayCount) * 100) / 100;

  return {
    groupId,
    groupName,
    headDays,
    avgHead,
    headAtStart,
    headAtEnd: head,
  };
}

export async function computeCustomerHeadDays(
  orgId: string,
  customerId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ groups: GroupHeadDaysResult[]; totalHeadDays: number; avgHead: number }> {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("cattle_groups")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .eq("is_active", true);

  const results: GroupHeadDaysResult[] = [];
  for (const g of groups ?? []) {
    results.push(await computeGroupHeadDays(orgId, g.id, g.name, periodStart, periodEnd));
  }

  const totalHeadDays = results.reduce((s, r) => s + r.headDays, 0);
  const dayCount = daysInclusive(periodStart, periodEnd);
  const avgHead =
    dayCount > 0 && results.length > 0
      ? Math.round((totalHeadDays / dayCount) * 100) / 100
      : 0;

  return { groups: results, totalHeadDays, avgHead };
}
