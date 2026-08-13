import { createClient } from "@/lib/supabase/server";
import { getOwnerGroupMemberships } from "@/lib/owners/queries";
import { computeGroupHeadDays } from "@/lib/invoices/head-days";
import { getEffectiveStartingHead } from "@/lib/inventory/lot-display";
import { daysOnFeed } from "@/lib/inventory/lot-display";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import { sumFeedCostForPeriod } from "@/lib/reports/operations-pl";
import { roundMoney } from "@/lib/reports/period";
import type {
  OwnerTotalsLocationRow,
  OwnerTotalsLotRow,
  OwnerTotalsMetrics,
  OwnerTotalsOwnerRow,
  OwnerTotalsReport,
} from "./owner-totals-types";

function daysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyMetrics(): OwnerTotalsMetrics {
  return {
    currentHead: 0,
    totalReceived: 0,
    totalShipped: 0,
    deathLoss: 0,
    currentInventory: 0,
    totalExpenses: 0,
    costPerHead: null,
    avgDailyCost: null,
    headDays: 0,
    daysOnFeed: null,
  };
}

function finalizeMetrics(m: OwnerTotalsMetrics): OwnerTotalsMetrics {
  const costPerHead =
    m.currentInventory > 0
      ? roundMoney(m.totalExpenses / m.currentInventory)
      : m.totalReceived > 0
        ? roundMoney(m.totalExpenses / m.totalReceived)
        : null;
  const avgDailyCost =
    m.headDays > 0 ? roundMoney(m.totalExpenses / m.headDays) : null;
  return {
    ...m,
    totalExpenses: roundMoney(m.totalExpenses),
    costPerHead,
    avgDailyCost,
    headDays: round2(m.headDays),
    currentHead: round2(m.currentHead),
    currentInventory: round2(m.currentInventory),
  };
}

function addMetrics(target: OwnerTotalsMetrics, source: OwnerTotalsMetrics, scale = 1) {
  target.currentHead += source.currentHead * scale;
  target.totalReceived += source.totalReceived * scale;
  target.totalShipped += source.totalShipped * scale;
  target.deathLoss += source.deathLoss * scale;
  target.currentInventory += source.currentInventory * scale;
  target.totalExpenses += source.totalExpenses * scale;
  target.headDays += source.headDays * scale;
  if (source.daysOnFeed != null) {
    target.daysOnFeed =
      target.daysOnFeed == null
        ? source.daysOnFeed
        : Math.round((target.daysOnFeed + source.daysOnFeed) / 2);
  }
}

interface LotShare {
  groupId: string;
  groupName: string;
  share: number;
  ownerId: string | null;
  ownerName: string | null;
}

interface GroupMeta {
  id: string;
  name: string;
  lotNumber: string | null;
  lotStatus: string;
  locationId: string | null;
  ownerId: string | null;
  startingHead: number | null;
  totalHead: number;
  openedAt: string | null;
  arrivalDate: string | null;
}

async function resolveLotShares(orgId: string, ownerId?: string): Promise<LotShare[]> {
  const supabase = await createClient();
  const { data: directGroups } = await supabase
    .from("cattle_groups")
    .select("id, name, owner_id, customer_id, ownership_group_id")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const ownerIds = new Set<string>();
  for (const g of directGroups ?? []) {
    const id =
      (g as { owner_id?: string | null }).owner_id ??
      g.customer_id ??
      g.ownership_group_id;
    if (id) ownerIds.add(id);
  }

  const ownerNameById = new Map<string, string>();
  if (ownerIds.size > 0) {
    const { data: owners } = await supabase
      .from("owners")
      .select("id, name")
      .eq("organization_id", orgId)
      .in("id", [...ownerIds]);
    for (const o of owners ?? []) ownerNameById.set(o.id, o.name);
  }

  const shares: LotShare[] = [];
  if (!ownerId) {
    for (const g of directGroups ?? []) {
      const lotOwnerId =
        (g as { owner_id?: string | null }).owner_id ??
        g.customer_id ??
        g.ownership_group_id ??
        null;
      shares.push({
        groupId: g.id,
        groupName: g.name,
        share: 1,
        ownerId: lotOwnerId,
        ownerName: lotOwnerId ? (ownerNameById.get(lotOwnerId) ?? null) : null,
      });
    }
    return shares;
  }

  for (const g of directGroups ?? []) {
    const lotOwnerId =
      (g as { owner_id?: string | null }).owner_id ?? g.customer_id ?? g.ownership_group_id;
    if (lotOwnerId === ownerId) {
      shares.push({
        groupId: g.id,
        groupName: g.name,
        share: 1,
        ownerId,
        ownerName: ownerNameById.get(ownerId) ?? null,
      });
    }
  }

  const memberships = await getOwnerGroupMemberships(orgId, ownerId);
  for (const membership of memberships) {
    for (const g of directGroups ?? []) {
      const lotOwnerId =
        (g as { owner_id?: string | null }).owner_id ?? g.customer_id ?? g.ownership_group_id;
      if (lotOwnerId === membership.group_owner_id) {
        shares.push({
          groupId: g.id,
          groupName: g.name,
          share: membership.percentage / 100,
          ownerId,
          ownerName: ownerNameById.get(ownerId) ?? null,
        });
      }
    }
  }

  return shares;
}

export async function buildOwnerTotalsReport(
  orgId: string,
  periodStart: string,
  periodEnd: string,
  options?: {
    ownerId?: string;
    lotId?: string;
    locationId?: string;
    lotStatus?: "active" | "closed" | "all";
    search?: string;
  },
): Promise<OwnerTotalsReport | { error: string }> {
  if (periodEnd < periodStart) {
    return { error: "End date must be on or after start date" };
  }

  const dayCount = daysInclusive(periodStart, periodEnd);
  const supabase = await createClient();
  const lotShares = await resolveLotShares(orgId, options?.ownerId);
  const groupIds = [...new Set(lotShares.map((l) => l.groupId))];

  if (groupIds.length === 0) {
    return {
      periodStart,
      periodEnd,
      dayCount,
      owners: [],
      totals: finalizeMetrics(emptyMetrics()),
      warnings: ["No cattle groups match the current filters."],
    };
  }

  const [{ data: groups }, { data: locations }, { data: owners }] = await Promise.all([
    supabase
      .from("cattle_groups")
      .select(
        "id, name, lot_number, lot_status, location_id, owner_id, customer_id, ownership_group_id, starting_head, opened_at, arrival_date, purchase_date",
      )
      .eq("organization_id", orgId)
      .in("id", groupIds),
    supabase.from("locations").select("*").eq("organization_id", orgId).eq("is_active", true),
    supabase
      .from("owners")
      .select("id, name, is_ownership_group")
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  const allLocations = (locations ?? []) as LocationRow[];
  const ownerNameById = new Map((owners ?? []).map((o) => [o.id, o.name]));
  const search = options?.search?.trim().toLowerCase();

  const { data: inventoryRows } = await supabase
    .from("group_inventory_counts")
    .select("cattle_group_id, head_count")
    .eq("organization_id", orgId)
    .in("cattle_group_id", groupIds);

  const headByGroup = new Map<string, number>();
  for (const row of inventoryRows ?? []) {
    headByGroup.set(
      row.cattle_group_id,
      (headByGroup.get(row.cattle_group_id) ?? 0) + (row.head_count ?? 0),
    );
  }

  const filteredShares: LotShare[] = [];
  const groupMetaById = new Map<string, GroupMeta>();

  for (const share of lotShares) {
    const g = groups?.find((row) => row.id === share.groupId);
    if (!g) continue;

    const lotStatus = g.lot_status ?? "active";
    if (options?.lotStatus === "active" && lotStatus === "closed") continue;
    if (options?.lotStatus === "closed" && lotStatus !== "closed") continue;
    if (options?.lotId && g.id !== options.lotId) continue;
    if (options?.locationId && g.location_id !== options.locationId) continue;

    const ownerId =
      (g as { owner_id?: string | null }).owner_id ??
      g.customer_id ??
      g.ownership_group_id ??
      share.ownerId;
    const ownerName = ownerId ? (ownerNameById.get(ownerId) ?? share.ownerName) : share.ownerName;

    if (search) {
      const hay = [g.name, g.lot_number, ownerName, share.groupName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) continue;
    }

    const totalHead = headByGroup.get(g.id) ?? 0;
    const startingHead = getEffectiveStartingHead(
      { starting_head: g.starting_head, total_head: totalHead },
      [],
    );

    groupMetaById.set(g.id, {
      id: g.id,
      name: g.name,
      lotNumber: g.lot_number,
      lotStatus,
      locationId: g.location_id,
      ownerId: ownerId ?? null,
      startingHead,
      totalHead,
      openedAt: g.opened_at ?? g.arrival_date ?? g.purchase_date,
      arrivalDate: g.arrival_date ?? g.opened_at ?? g.purchase_date,
    });

    filteredShares.push({
      ...share,
      ownerId: ownerId ?? null,
      ownerName: ownerName ?? null,
    });
  }

  const activeGroupIds = [...new Set(filteredShares.map((s) => s.groupId))];
  if (activeGroupIds.length === 0) {
    return {
      periodStart,
      periodEnd,
      dayCount,
      owners: [],
      totals: finalizeMetrics(emptyMetrics()),
      warnings: ["No lots match the current filters."],
    };
  }

  const [
    salesRes,
    shippingRes,
    deathsRes,
    feedRes,
    treatRes,
    procRes,
    expenseRes,
    miscRes,
  ] = await Promise.all([
    supabase
      .from("sales_records")
      .select("cattle_group_id, head_count, total_amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("sale_date", periodStart)
      .lte("sale_date", periodEnd)
      .in("cattle_group_id", activeGroupIds),
    supabase
      .from("cattle_shipping_records")
      .select("cattle_group_id, head_count, direction")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("shipped_at", periodStart)
      .lte("shipped_at", periodEnd)
      .in("cattle_group_id", activeGroupIds),
    supabase
      .from("mortality_records")
      .select("cattle_group_id, head_count, value_lost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("died_at", periodStart)
      .lte("died_at", periodEnd)
      .in("cattle_group_id", activeGroupIds),
    supabase
      .from("feeding_records")
      .select("cattle_group_id, quantity, total_feed_cost, feed_ration_id, fed_at, unit_cost_snapshot")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("fed_at", periodStart)
      .lte("fed_at", periodEnd)
      .in("cattle_group_id", activeGroupIds),
    supabase
      .from("treatment_records")
      .select("cattle_group_id, quantity_used, medicine_item_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("treatment_date", periodStart)
      .lte("treatment_date", periodEnd)
      .in("cattle_group_id", activeGroupIds),
    supabase
      .from("processing_events")
      .select("cattle_group_id, chute_charge, labor_charge, processing_fee, medicine_cost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("processed_at", periodStart)
      .lte("processed_at", periodEnd)
      .in("cattle_group_id", activeGroupIds),
    supabase
      .from("lot_expenses")
      .select("cattle_group_id, amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("expense_date", periodStart)
      .lte("expense_date", periodEnd)
      .in("cattle_group_id", activeGroupIds),
    supabase
      .from("owner_misc_charges")
      .select("owner_id, cattle_group_id, amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("charge_date", periodStart)
      .lte("charge_date", periodEnd),
  ]);

  const shippingData: Array<{
    cattle_group_id: string;
    head_count: number;
    direction: string;
  }> = shippingRes.error ? [] : (shippingRes.data ?? []);

  const medicineIds = [
    ...new Set((treatRes.data ?? []).map((t) => t.medicine_item_id).filter(Boolean)),
  ] as string[];
  const { data: meds } = medicineIds.length
    ? await supabase.from("medicine_items").select("id, price_per_cc, avg_unit_cost").in("id", medicineIds)
    : { data: [] };
  const medPrice = new Map(
    (meds ?? []).map((m) => {
      const avg =
        (m as { avg_unit_cost?: number | null }).avg_unit_cost != null
          ? Number((m as { avg_unit_cost?: number | null }).avg_unit_cost)
          : m.price_per_cc != null
            ? Number(m.price_per_cc)
            : 0;
      return [m.id, avg];
    }),
  );

  const feedByGroup = new Map<string, typeof feedRes.data>();
  for (const f of feedRes.data ?? []) {
    if (!f.cattle_group_id) continue;
    const list = feedByGroup.get(f.cattle_group_id) ?? [];
    list.push(f);
    feedByGroup.set(f.cattle_group_id, list);
  }

  const lotRows: OwnerTotalsLotRow[] = [];

  for (const share of filteredShares) {
    const meta = groupMetaById.get(share.groupId);
    if (!meta) continue;

    const scaled = share.share;
    const currentHead = round2(meta.totalHead * scaled);
    const totalReceived = round2((meta.startingHead ?? meta.totalHead) * scaled);

    let totalShipped = 0;
    for (const s of salesRes.data ?? []) {
      if (s.cattle_group_id === share.groupId) totalShipped += s.head_count ?? 0;
    }
    for (const s of shippingData) {
      if (s.cattle_group_id === share.groupId && s.direction === "out") {
        totalShipped += s.head_count ?? 0;
      }
    }
    totalShipped = round2(totalShipped * scaled);

    let deathLoss = 0;
    let mortalityCost = 0;
    for (const d of deathsRes.data ?? []) {
      if (d.cattle_group_id === share.groupId) {
        deathLoss += d.head_count ?? 0;
        mortalityCost += d.value_lost != null ? Number(d.value_lost) : 0;
      }
    }
    deathLoss = round2(deathLoss * scaled);

    const groupFeedings = feedByGroup.get(share.groupId) ?? [];
    const feedCost = (await sumFeedCostForPeriod(orgId, groupFeedings)) * scaled;

    let medicineCost = 0;
    for (const t of treatRes.data ?? []) {
      if (t.cattle_group_id === share.groupId && t.medicine_item_id && t.quantity_used) {
        medicineCost +=
          Number(t.quantity_used) * (medPrice.get(t.medicine_item_id) ?? 0);
      }
    }
    medicineCost *= scaled;

    let processingCost = 0;
    for (const p of procRes.data ?? []) {
      if (p.cattle_group_id === share.groupId) {
        processingCost +=
          Number(p.chute_charge ?? 0) +
          Number(p.labor_charge ?? 0) +
          Number(p.processing_fee ?? 0) +
          Number(p.medicine_cost ?? 0);
      }
    }
    processingCost *= scaled;

    let otherExpenses = 0;
    for (const e of expenseRes.data ?? []) {
      if (e.cattle_group_id === share.groupId) otherExpenses += Number(e.amount);
    }
    otherExpenses *= scaled;

    let miscCost = 0;
    for (const m of miscRes.data ?? []) {
      if (m.cattle_group_id === share.groupId) miscCost += Number(m.amount);
      else if (!m.cattle_group_id && m.owner_id === share.ownerId) {
        miscCost += Number(m.amount) * scaled;
      }
    }

    const head = await computeGroupHeadDays(
      orgId,
      share.groupId,
      share.groupName,
      periodStart,
      periodEnd,
    );
    const headDays = round2(head.headDays * scaled);
    const receivedDate = meta.openedAt ?? meta.arrivalDate;
    const dof = receivedDate ? daysOnFeed(receivedDate) : null;

    const locationName =
      meta.locationId && allLocations.length
        ? (allLocations.find((l) => l.id === meta.locationId)?.name ?? null)
        : null;
    const locationBreadcrumb =
      meta.locationId && allLocations.length
        ? getBreadcrumb(meta.locationId, allLocations)
            .map((l) => l.name)
            .join(" › ")
        : null;

    const metrics = finalizeMetrics({
      currentHead,
      totalReceived,
      totalShipped,
      deathLoss,
      currentInventory: currentHead,
      totalExpenses:
        feedCost + medicineCost + processingCost + otherExpenses + miscCost + mortalityCost * scaled,
      costPerHead: null,
      avgDailyCost: null,
      headDays,
      daysOnFeed: dof,
    });

    lotRows.push({
      ...metrics,
      lotId: share.groupId,
      lotName: share.groupName,
      lotNumber: meta.lotNumber,
      lotStatus: meta.lotStatus,
      locationId: meta.locationId,
      locationName,
      locationBreadcrumb,
      ownerId: share.ownerId,
      ownerName: share.ownerName,
      ownerShare: share.share,
    });
  }

  const ownerMap = new Map<string, OwnerTotalsOwnerRow>();
  const unassignedOwnerId = "__unassigned__";

  for (const lot of lotRows) {
    const ownerId = lot.ownerId ?? unassignedOwnerId;
    const ownerName = lot.ownerName ?? "Unassigned owner";
    let ownerRow = ownerMap.get(ownerId);
    if (!ownerRow) {
      ownerRow = {
        ...finalizeMetrics(emptyMetrics()),
        ownerId,
        ownerName,
        lotCount: 0,
        lots: [],
        byLocation: [],
      };
      ownerMap.set(ownerId, ownerRow);
    }
    ownerRow.lotCount += 1;
    ownerRow.lots.push(lot);
    addMetrics(ownerRow, lot);
  }

  for (const owner of ownerMap.values()) {
    const locMap = new Map<string, OwnerTotalsLocationRow>();
    for (const lot of owner.lots) {
      const key = lot.locationId ?? "__unassigned__";
      let loc = locMap.get(key);
      if (!loc) {
        loc = {
          ...finalizeMetrics(emptyMetrics()),
          locationId: lot.locationId,
          locationName: lot.locationName ?? "No pen assigned",
          locationBreadcrumb: lot.locationBreadcrumb,
          lotIds: [],
        };
        locMap.set(key, loc);
      }
      loc.lotIds.push(lot.lotId);
      addMetrics(loc, lot);
    }
    owner.byLocation = [...locMap.values()]
      .map((loc) => ({
        ...loc,
        ...finalizeMetrics(loc),
      }))
      .sort((a, b) =>
        (a.locationBreadcrumb ?? a.locationName).localeCompare(
          b.locationBreadcrumb ?? b.locationName,
        ),
      );
    Object.assign(owner, finalizeMetrics(owner));
    owner.lots.sort((a, b) => a.lotName.localeCompare(b.lotName));
  }

  const ownerRows = [...ownerMap.values()]
    .filter((o) => o.ownerId !== unassignedOwnerId || o.lotCount > 0)
    .sort((a, b) => a.ownerName.localeCompare(b.ownerName));

  const totals = finalizeMetrics(emptyMetrics());
  for (const owner of ownerRows) addMetrics(totals, owner);

  return {
    periodStart,
    periodEnd,
    dayCount,
    owners: ownerRows,
    totals,
    warnings: [],
  };
}
