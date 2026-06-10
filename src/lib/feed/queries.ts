import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import type { FeedRationOption, FeedRationRecord, FeedingContext, FeedingRecord, FeedingSummary } from "./types";

const DB_HINT = "Run supabase/RUN_PHASE10.sql or supabase db push, then retry.";

export async function listFeedRations(orgId: string): Promise<FeedRationRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feed_rations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    price_per_unit: r.price_per_unit != null ? Number(r.price_per_unit) : null,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getFeedRation(orgId: string, id: string): Promise<FeedRationRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feed_rations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    unit: data.unit,
    price_per_unit: data.price_per_unit != null ? Number(data.price_per_unit) : null,
    notes: data.notes,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function listFeedRationOptions(orgId: string): Promise<FeedRationOption[]> {
  const rations = await listFeedRations(orgId);
  return rations.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    price_per_unit: r.price_per_unit,
  }));
}

type FeedingRow = {
  id: string;
  fed_at: string;
  feeding_context?: string;
  feed_ration_id: string;
  quantity: number;
  head_count: number | null;
  cattle_group_id: string | null;
  location_id: string | null;
  ownership_group_id: string | null;
  fed_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

async function enrichFeedings(orgId: string, rows: FeedingRow[]): Promise<FeedingRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const rationIds = [...new Set(rows.map((r) => r.feed_ration_id))];
  const groupIds = [...new Set(rows.map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  const ownerIds = [...new Set(rows.map((r) => r.ownership_group_id).filter(Boolean))] as string[];
  const profileIds = [
    ...new Set(rows.flatMap((r) => [r.fed_by, r.created_by].filter(Boolean))),
  ] as string[];

  const [
    { data: rations },
    { data: groups },
    { data: locations },
    { data: owners },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("feed_rations").select("id, name, unit").in("id", rationIds),
    groupIds.length
      ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("locations").select("id, name, parent_id, depth, path").in("id", locationIds)
      : Promise.resolve({ data: [] }),
    ownerIds.length
      ? supabase.from("ownership_groups").select("id, name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const rationMap = new Map((rations ?? []).map((r) => [r.id, r]));
  const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.name]));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  const locRows = (locations ?? []) as LocationRow[];
  const allLocs =
    locRows.length > 0
      ? (
          await supabase
            .from("locations")
            .select("id, name, parent_id, depth, path")
            .eq("organization_id", orgId)
            .eq("is_active", true)
        ).data ?? []
      : [];
  const locLabels = new Map(
    locRows.map((l) => [
      l.id,
      getBreadcrumb(l.id, allLocs as LocationRow[])
        .map((x) => x.name)
        .join(" › "),
    ]),
  );

  return rows.map((row) => {
    const ration = rationMap.get(row.feed_ration_id);
    return {
      id: row.id,
      fed_at: row.fed_at,
      feeding_context: (row.feeding_context === "cow_calf" ? "cow_calf" : "general") as FeedingContext,
      feed_ration_id: row.feed_ration_id,
      feed_ration_name: ration?.name ?? "Unknown ration",
      feed_ration_unit: ration?.unit ?? "",
      quantity: Number(row.quantity),
      head_count: row.head_count,
      cattle_group_id: row.cattle_group_id,
      cattle_group_name: row.cattle_group_id ? groupMap.get(row.cattle_group_id) ?? null : null,
      location_id: row.location_id,
      location_label: row.location_id ? locLabels.get(row.location_id) ?? null : null,
      ownership_group_id: row.ownership_group_id,
      ownership_group_name: row.ownership_group_id
        ? ownerMap.get(row.ownership_group_id) ?? null
        : null,
      fed_by: row.fed_by,
      fed_by_name: row.fed_by ? profileMap.get(row.fed_by) ?? null : null,
      notes: row.notes,
      created_by: row.created_by,
      created_by_name: row.created_by ? profileMap.get(row.created_by) ?? null : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

export async function listFeedingRecords(
  orgId: string,
  options?: { limit?: number; context?: FeedingContext },
): Promise<FeedingRecord[]> {
  const limit = options?.limit ?? 50;
  const supabase = await createClient();
  let query = supabase
    .from("feeding_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("fed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.context) {
    query = query.eq("feeding_context", options.context);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.includes("feeding_context") && options?.context) {
      return listFeedingRecords(orgId, { limit });
    }
    throw new Error(`${error.message} — ${DB_HINT}`);
  }
  return enrichFeedings(orgId, (data ?? []) as FeedingRow[]);
}

export async function getFeedingRecord(orgId: string, id: string): Promise<FeedingRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feeding_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  if (!data) return null;
  const [record] = await enrichFeedings(orgId, [data as FeedingRow]);
  return record ?? null;
}

export async function getFeedingSummary(
  orgId: string,
  context?: FeedingContext,
): Promise<FeedingSummary> {
  const supabase = await createClient();
  let query = supabase
    .from("feeding_records")
    .select("fed_at, quantity, feeding_context")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (context) {
    query = query.eq("feeding_context", context);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.includes("feeding_context") && context) {
      return getFeedingSummary(orgId);
    }
    throw new Error(`${error.message} — ${DB_HINT}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const weekAgo = new Date(`${today}T12:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = weekAgo.toISOString().slice(0, 10);

  const rows = data ?? [];
  const thisMonthRows = rows.filter((r) => r.fed_at >= monthStart);
  return {
    thisMonth: thisMonthRows.length,
    last7Days: rows.filter((r) => r.fed_at >= weekStart).length,
    totalQuantityThisMonth: thisMonthRows.reduce((s, r) => s + Number(r.quantity), 0),
  };
}
