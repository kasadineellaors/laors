import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import {
  computeHeadDiscrepancy,
  fetchCattleListEnrichment,
} from "./cattle-list-enrichment";
import type { CattleGroupSummary, MovementRecord } from "./types";

type GroupRow = {
  id: string;
  name: string;
  location_id: string | null;
  notes: string | null;
  ownership_group_id: string | null;
  customer_id: string | null;
  owner_id?: string | null;
  lot_number: string | null;
  enterprise_type: string;
  lot_status: string;
  opened_at: string | null;
  closed_at: string | null;
  purchase_date: string | null;
  arrival_date: string | null;
  starting_head: number | null;
  pay_weight_lbs: number | null;
  shrunk_weight_lbs: number | null;
  received_weight_lbs: number | null;
  avg_weight_lbs: number | null;
  current_avg_weight_lbs?: number | null;
  purchase_price_per_lb: number | null;
  landed_cost: number | null;
  seller_name: string | null;
  source_name: string | null;
};

async function loadOwnerNames(
  orgId: string,
  supabase: SupabaseClient<Database>,
): Promise<Map<string, string>> {
  const { data: owners } = await supabase
    .from("owners")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (owners?.length) {
    return new Map(owners.map((o) => [o.id, o.name]));
  }

  const [{ data: ownershipGroups }, { data: customers }] = await Promise.all([
    supabase.from("ownership_groups").select("id, name").eq("organization_id", orgId).eq("is_active", true),
    supabase.from("customers").select("id, name").eq("organization_id", orgId).eq("is_active", true),
  ]);

  const names = new Map<string, string>();
  for (const o of ownershipGroups ?? []) names.set(o.id, o.name);
  for (const c of customers ?? []) names.set(c.id, c.name);
  return names;
}

function resolveOwnerName(
  g: GroupRow,
  ownerNames: Map<string, string>,
  ownershipNames: Map<string, string>,
  customerNames: Map<string, string>,
): string | null {
  if (g.owner_id) return ownerNames.get(g.owner_id) ?? null;
  if (g.customer_id) return customerNames.get(g.customer_id) ?? null;
  if (g.ownership_group_id) return ownershipNames.get(g.ownership_group_id) ?? null;
  return null;
}

export async function listCattleGroups(
  orgId: string,
  supabaseClient?: SupabaseClient<Database>,
): Promise<CattleGroupSummary[]> {
  const supabase = supabaseClient ?? (await createClient());

  const baseSelect =
    "id, name, location_id, notes, ownership_group_id, customer_id, lot_number, enterprise_type, lot_status, opened_at, closed_at, purchase_date, arrival_date, starting_head, pay_weight_lbs, shrunk_weight_lbs, received_weight_lbs, avg_weight_lbs, purchase_price_per_lb, landed_cost, seller_name, source_name";

  const extendedRes = await supabase
    .from("cattle_groups")
    .select(`${baseSelect}, owner_id, current_avg_weight_lbs`)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  let groupRows: GroupRow[];
  if (!extendedRes.error && extendedRes.data) {
    groupRows = extendedRes.data as GroupRow[];
  } else {
    const basicRes = await supabase
      .from("cattle_groups")
      .select(baseSelect)
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name");
    if (basicRes.error) throw new Error(basicRes.error.message);
    groupRows = (basicRes.data ?? []) as GroupRow[];
  }

  const [{ data: locations }, { data: counts }, { data: classifications }, { data: ownershipGroups }, { data: customers }] =
    await Promise.all([
      supabase
        .from("locations")
        .select("id, name, parent_id, depth, path")
        .eq("organization_id", orgId)
        .eq("is_active", true),
      supabase
        .from("group_inventory_counts")
        .select("cattle_group_id, classification_id, head_count")
        .eq("organization_id", orgId),
      supabase
        .from("cattle_classifications")
        .select("id, name, short_code")
        .eq("organization_id", orgId)
        .eq("is_active", true),
      supabase
        .from("ownership_groups")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true),
      supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true),
    ]);

  const ownerNames = await loadOwnerNames(orgId, supabase);
  const ownershipNames = new Map((ownershipGroups ?? []).map((o) => [o.id, o.name]));
  const customerNames = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const locRows = (locations ?? []) as LocationRow[];
  const locName = new Map(locRows.map((l) => [l.id, l.name]));
  const classMap = new Map(
    (classifications ?? []).map((c) => [c.id, { name: c.name, short_code: c.short_code }]),
  );

  const countsByGroup = new Map<string, NonNullable<typeof counts>>();
  for (const row of counts ?? []) {
    const list = countsByGroup.get(row.cattle_group_id) ?? [];
    list.push(row);
    countsByGroup.set(row.cattle_group_id, list);
  }

  const groupIds = groupRows.map((g) => g.id);
  const enrichment = await fetchCattleListEnrichment(orgId, groupIds, supabase);

  return groupRows.map((g) => {
    const groupCounts = countsByGroup.get(g.id) ?? [];
    const lines = groupCounts.map((row) => {
      const cls = classMap.get(row.classification_id);
      return {
        classification_id: row.classification_id,
        classification_name: cls?.name ?? "Unknown",
        short_code: cls?.short_code ?? null,
        head_count: row.head_count,
      };
    });
    const total = lines.reduce((s, l) => s + l.head_count, 0);
    const breadcrumb = g.location_id
      ? getBreadcrumb(g.location_id, locRows)
          .map((l) => l.name)
          .join(" › ")
      : null;

    const startingHead = g.starting_head != null ? Number(g.starting_head) : null;
    const lotStatus = g.lot_status ?? "active";
    const headsSold = enrichment.headsSoldByGroup.get(g.id) ?? 0;
    const deaths = enrichment.deathsByGroup.get(g.id) ?? 0;

    return {
      id: g.id,
      name: g.name,
      location_id: g.location_id,
      location_name: g.location_id ? locName.get(g.location_id) ?? null : null,
      location_breadcrumb: breadcrumb,
      total_head: total,
      counts: lines.sort((a, b) => a.classification_name.localeCompare(b.classification_name)),
      notes: g.notes,
      ownership_group_id: g.ownership_group_id,
      ownership_group_name: g.ownership_group_id
        ? ownershipNames.get(g.ownership_group_id) ?? null
        : null,
      customer_id: g.customer_id,
      customer_name: g.customer_id ? customerNames.get(g.customer_id) ?? null : null,
      owner_id: g.owner_id ?? g.customer_id ?? g.ownership_group_id ?? null,
      owner_name: resolveOwnerName(g, ownerNames, ownershipNames, customerNames),
      open_treatment_count: enrichment.treatmentCountByGroup.get(g.id) ?? 0,
      feedings_today: enrichment.feedingsTodayByGroup.get(g.id) ?? 0,
      withdrawal_active: enrichment.withdrawalActiveByGroup.get(g.id) ?? false,
      head_discrepancy: computeHeadDiscrepancy(startingHead, total, headsSold, deaths, lotStatus),
      lot_number: g.lot_number ?? null,
      enterprise_type: g.enterprise_type ?? "stocker",
      lot_status: lotStatus,
      opened_at: g.opened_at ?? null,
      closed_at: g.closed_at ?? null,
      purchase_date: g.purchase_date ?? null,
      arrival_date: g.arrival_date ?? null,
      starting_head: startingHead,
      pay_weight_lbs: g.pay_weight_lbs != null ? Number(g.pay_weight_lbs) : null,
      shrunk_weight_lbs: g.shrunk_weight_lbs != null ? Number(g.shrunk_weight_lbs) : null,
      received_weight_lbs: g.received_weight_lbs != null ? Number(g.received_weight_lbs) : null,
      avg_weight_lbs: g.avg_weight_lbs != null ? Number(g.avg_weight_lbs) : null,
      current_avg_weight_lbs:
        g.current_avg_weight_lbs != null
          ? Number(g.current_avg_weight_lbs)
          : g.avg_weight_lbs != null
            ? Number(g.avg_weight_lbs)
            : null,
      purchase_price_per_lb:
        g.purchase_price_per_lb != null ? Number(g.purchase_price_per_lb) : null,
      landed_cost: g.landed_cost != null ? Number(g.landed_cost) : null,
      seller_name: g.seller_name ?? null,
      source_name: g.source_name ?? null,
    };
  });
}

export async function getCattleGroup(
  orgId: string,
  groupId: string,
  supabaseClient?: SupabaseClient<Database>,
): Promise<CattleGroupSummary | null> {
  const groups = await listCattleGroups(orgId, supabaseClient);
  return groups.find((g) => g.id === groupId) ?? null;
}

export async function listRecentMovements(
  orgId: string,
  limit = 25,
): Promise<MovementRecord[]> {
  const supabase = await createClient();

  const { data: movements, error } = await supabase
    .from("cattle_movements")
    .select("*")
    .eq("organization_id", orgId)
    .order("moved_at", { ascending: false })
    .limit(limit);

  if (error || !movements?.length) return [];

  const groupIds = [
    ...new Set(
      movements.flatMap((m) => [m.source_group_id, m.destination_group_id]),
    ),
  ];
  const locIds = [
    ...new Set(
      movements.flatMap((m) => [m.source_location_id, m.destination_location_id].filter(Boolean)),
    ),
  ] as string[];
  const reasonIds = [
    ...new Set(movements.map((m) => m.movement_reason_id).filter(Boolean)),
  ] as string[];

  const [{ data: groups }, { data: locations }, { data: reasons }, { data: lines }] =
    await Promise.all([
      supabase.from("cattle_groups").select("id, name").in("id", groupIds),
      locIds.length
        ? supabase.from("locations").select("id, name").in("id", locIds)
        : Promise.resolve({ data: [] }),
      reasonIds.length
        ? supabase.from("movement_reasons").select("id, name").in("id", reasonIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("cattle_movement_lines")
        .select("movement_id, classification_id, head_count")
        .in(
          "movement_id",
          movements.map((m) => m.id),
        ),
    ]);

  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const locNames = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const reasonNames = new Map((reasons ?? []).map((r) => [r.id, r.name]));

  const classIds = [...new Set((lines ?? []).map((l) => l.classification_id))];
  const { data: classifications } = classIds.length
    ? await supabase.from("cattle_classifications").select("id, name").in("id", classIds)
    : { data: [] };
  const classNames = new Map((classifications ?? []).map((c) => [c.id, c.name]));

  const linesByMove = new Map<string, MovementRecord["lines"]>();
  for (const line of lines ?? []) {
    const list = linesByMove.get(line.movement_id) ?? [];
    list.push({
      classification_id: line.classification_id,
      classification_name: classNames.get(line.classification_id) ?? "Unknown",
      head_count: line.head_count,
    });
    linesByMove.set(line.movement_id, list);
  }

  return movements.map((m) => ({
    id: m.id,
    moved_at: m.moved_at,
    status: m.status as "completed" | "voided",
    total_head: m.total_head,
    is_partial: m.is_partial,
    notes: m.notes,
    source_group_name: groupNames.get(m.source_group_id) ?? "Unknown",
    destination_group_name: groupNames.get(m.destination_group_id) ?? "Unknown",
    source_location_name: m.source_location_id
      ? locNames.get(m.source_location_id) ?? null
      : null,
    destination_location_name: m.destination_location_id
      ? locNames.get(m.destination_location_id) ?? null
      : null,
    reason_name: m.movement_reason_id
      ? reasonNames.get(m.movement_reason_id) ?? null
      : null,
    movement_reason_id: m.movement_reason_id,
    lines: linesByMove.get(m.id) ?? [],
  }));
}

export async function listGroupsAtLocation(
  orgId: string,
  locationId: string,
): Promise<{ id: string; name: string; total_head: number }[]> {
  const groups = await listCattleGroups(orgId);
  return groups
    .filter((g) => g.location_id === locationId)
    .map((g) => ({ id: g.id, name: g.name, total_head: g.total_head }));
}
