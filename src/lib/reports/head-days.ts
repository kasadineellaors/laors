import { createClient } from "@/lib/supabase/server";
import { getOwnerGroupMemberships } from "@/lib/owners/queries";
import { computeGroupHeadDays } from "@/lib/invoices/head-days";
import { loadOrgBillingModes } from "@/lib/invoices/billing-locations";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import type { GroupHeadDaysBreakdown } from "@/lib/invoices/types";

function daysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface LotShare {
  groupId: string;
  groupName: string;
  share: number;
  ownerId: string | null;
  ownerName: string | null;
}

async function resolveLotShares(
  orgId: string,
  ownerId?: string,
): Promise<LotShare[]> {
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
    for (const o of owners ?? []) {
      ownerNameById.set(o.id, o.name);
    }
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

export interface HeadDaysPenRow {
  locationId: string | null;
  locationName: string;
  locationBreadcrumb: string | null;
  billingMode: "pasture" | "yardage";
  headDays: number;
  pastureHeadDays: number;
  yardageHeadDays: number;
  avgHead: number;
  lotCount: number;
}

export interface HeadDaysLotRow extends GroupHeadDaysBreakdown {
  ownerId: string | null;
  ownerName: string | null;
  locationBreadcrumb: string | null;
}

export interface HeadDaysReport {
  periodStart: string;
  periodEnd: string;
  dayCount: number;
  totalHeadDays: number;
  pastureHeadDays: number;
  yardageHeadDays: number;
  avgHead: number;
  lots: HeadDaysLotRow[];
  byPen: HeadDaysPenRow[];
  warnings: string[];
}

export async function buildHeadDaysReport(
  orgId: string,
  periodStart: string,
  periodEnd: string,
  options?: { ownerId?: string },
): Promise<HeadDaysReport | { error: string }> {
  if (periodEnd < periodStart) {
    return { error: "End date must be on or after start date" };
  }

  const dayCount = daysInclusive(periodStart, periodEnd);
  const supabase = await createClient();
  const lotShares = await resolveLotShares(orgId, options?.ownerId);
  const groupIds = [...new Set(lotShares.map((l) => l.groupId))];

  const warnings: string[] = [];
  if (groupIds.length === 0) {
    warnings.push(
      options?.ownerId
        ? "No cattle groups linked to this owner."
        : "No active cattle groups on the ranch.",
    );
  }

  const billingModes = await loadOrgBillingModes(orgId);
  const groupLocationById = new Map<string, string | null>();

  const [{ data: groupRows }, { data: locations }] = await Promise.all([
    groupIds.length
      ? supabase
          .from("cattle_groups")
          .select("id, location_id")
          .eq("organization_id", orgId)
          .in("id", groupIds)
      : Promise.resolve({ data: [] }),
    supabase.from("locations").select("*").eq("organization_id", orgId).eq("is_active", true),
  ]);

  const allLocations = (locations ?? []) as LocationRow[];

  for (const g of groupRows ?? []) {
    groupLocationById.set(g.id, g.location_id);
  }

  const lots: HeadDaysLotRow[] = [];
  let totalHeadDays = 0;
  let pastureHeadDays = 0;
  let yardageHeadDays = 0;

  for (const lot of lotShares) {
    const head = await computeGroupHeadDays(
      orgId,
      lot.groupId,
      lot.groupName,
      periodStart,
      periodEnd,
    );
    const scaledHeadDays = round2(head.headDays * lot.share);
    totalHeadDays += scaledHeadDays;

    const locationId = groupLocationById.get(lot.groupId) ?? null;
    const billing = billingModes.resolveForLocationId(locationId);
    const scaledPasture = billing.mode === "pasture" ? scaledHeadDays : 0;
    const scaledYardage = billing.mode === "yardage" ? scaledHeadDays : 0;

    pastureHeadDays += scaledPasture;
    yardageHeadDays += scaledYardage;

    const breadcrumb =
      locationId && allLocations.length
        ? getBreadcrumb(locationId, allLocations)
            .map((l) => l.name)
            .join(" › ")
        : null;

    if (!locationId) {
      warnings.push(`${lot.groupName}: no pen assigned — counted as yardage.`);
    }

    lots.push({
      groupId: lot.groupId,
      groupName: lot.groupName,
      headDays: scaledHeadDays,
      pastureHeadDays: scaledPasture,
      yardageHeadDays: scaledYardage,
      avgHead: round2(head.avgHead * lot.share),
      headAtStart: head.headAtStart,
      headAtEnd: head.headAtEnd,
      billingMode: billing.mode,
      locationId: billing.locationId,
      locationName: billing.locationName,
      locationBreadcrumb: breadcrumb,
      ownerShare: lot.share,
      ownerId: lot.ownerId,
      ownerName: lot.ownerName,
    });
  }

  const penMap = new Map<string, HeadDaysPenRow>();
  for (const lot of lots) {
    const key = lot.locationId ?? "__unassigned__";
    const existing = penMap.get(key);
    const locationName = lot.locationName ?? "No pen assigned";
    if (existing) {
      existing.headDays = round2(existing.headDays + lot.headDays);
      existing.pastureHeadDays = round2(existing.pastureHeadDays + lot.pastureHeadDays);
      existing.yardageHeadDays = round2(existing.yardageHeadDays + lot.yardageHeadDays);
      existing.avgHead = round2(existing.avgHead + lot.avgHead);
      existing.lotCount += 1;
    } else {
      penMap.set(key, {
        locationId: lot.locationId,
        locationName,
        locationBreadcrumb: lot.locationBreadcrumb,
        billingMode: lot.billingMode,
        headDays: lot.headDays,
        pastureHeadDays: lot.pastureHeadDays,
        yardageHeadDays: lot.yardageHeadDays,
        avgHead: lot.avgHead,
        lotCount: 1,
      });
    }
  }

  const byPen = [...penMap.values()].sort((a, b) =>
    (a.locationBreadcrumb ?? a.locationName).localeCompare(
      b.locationBreadcrumb ?? b.locationName,
    ),
  );

  const avgHead = dayCount > 0 ? round2(totalHeadDays / dayCount) : 0;

  return {
    periodStart,
    periodEnd,
    dayCount,
    totalHeadDays: round2(totalHeadDays),
    pastureHeadDays: round2(pastureHeadDays),
    yardageHeadDays: round2(yardageHeadDays),
    avgHead,
    lots: lots.sort((a, b) => a.groupName.localeCompare(b.groupName)),
    byPen,
    warnings,
  };
}
