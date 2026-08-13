import { createClient } from "@/lib/supabase/server";
import { getOwner, getOwnerGroupMemberships } from "@/lib/owners/queries";
import { computeGroupHeadDays } from "@/lib/invoices/head-days";
import { loadOrgBillingModes } from "@/lib/invoices/billing-locations";
import {
  getRationUnitPricesAtDates,
  rationPriceLookupKey,
} from "@/lib/feed/inventory-queries";
import { convertFeedQuantity, formatFeedUnitLabel } from "@/lib/feed/units";
import { formatHeadDays, formatMoney, formatTons } from "@/lib/invoices/format-billing";
import { medicineBillableUnitPrice } from "@/lib/medicine/costing";
import type {
  BillingCategory,
  BillingLinePreview,
  BillingPreview,
  BillingSnapshot,
  GroupHeadDaysBreakdown,
} from "./types";

function daysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  return Math.max(0, diff);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T12:00:00`);
  const end = new Date(`${periodEnd}T12:00:00`);
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return `${periodStart} – ${periodEnd}`;
}

interface LotShare {
  groupId: string;
  groupName: string;
  share: number;
}

async function resolveOwnerLotShares(
  orgId: string,
  ownerId: string,
): Promise<LotShare[]> {
  const supabase = await createClient();
  const shares: LotShare[] = [];

  const { data: directGroups } = await supabase
    .from("cattle_groups")
    .select("id, name, owner_id, customer_id, ownership_group_id")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  for (const g of directGroups ?? []) {
    const lotOwnerId =
      (g as { owner_id?: string | null }).owner_id ?? g.customer_id ?? g.ownership_group_id;
    if (lotOwnerId === ownerId) {
      shares.push({ groupId: g.id, groupName: g.name, share: 1 });
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
        });
      }
    }
  }

  return shares;
}

interface TreatmentBillingRow {
  id: string;
  product_name?: string;
  cattle_group_id: string | null;
  medicine_item_id: string | null;
  quantity_used: number | null;
}

interface FeedRationRollup {
  rationId: string;
  rationName: string;
  unit: string;
  tons: number;
  nativeQuantity: number;
  totalCost: number;
  deliveryCount: number;
}

function getFeedRollup(
  map: Map<string, FeedRationRollup>,
  rationId: string,
  rationName: string,
  unit: string,
): FeedRationRollup {
  let rollup = map.get(rationId);
  if (!rollup) {
    rollup = {
      rationId,
      rationName,
      unit,
      tons: 0,
      nativeQuantity: 0,
      totalCost: 0,
      deliveryCount: 0,
    };
    map.set(rationId, rollup);
  }
  return rollup;
}

function pushFeedRationLines(
  lines: BillingLinePreview[],
  rollups: FeedRationRollup[],
  periodLabel: string,
) {
  const sorted = [...rollups].sort((a, b) => a.rationName.localeCompare(b.rationName));

  for (const rollup of sorted) {
    if (rollup.totalCost <= 0) continue;

    const totalLabel = formatMoney(rollup.totalCost);
    const deliveryLabel = `${rollup.deliveryCount} deliver${rollup.deliveryCount === 1 ? "y" : "ies"}`;

    if (rollup.tons > 0) {
      const tons = Math.round(rollup.tons * 1000) / 1000;
      const pricePerTon = roundMoney(rollup.totalCost / tons);
      lines.push(
        categoryLine(
          "feed",
          `Feed — ${rollup.rationName} — ${formatTons(tons)} tons`,
          tons,
          pricePerTon,
          `${deliveryLabel} · ${formatTons(tons)} tons × ${formatMoney(pricePerTon)}/ton = ${totalLabel}`,
        ),
      );
      continue;
    }

    const qty = Math.round(rollup.nativeQuantity * 100) / 100;
    if (qty <= 0) {
      lines.push(
        categoryLine(
          "feed",
          `Feed — ${rollup.rationName} — ${periodLabel}`,
          1,
          rollup.totalCost,
          `${deliveryLabel} · ${totalLabel} total`,
        ),
      );
      continue;
    }

    const unitLabel = formatFeedUnitLabel(rollup.unit);
    const unitPrice = roundMoney(rollup.totalCost / qty);
    lines.push(
      categoryLine(
        "feed",
        `Feed — ${rollup.rationName} — ${formatHeadDays(qty)} ${unitLabel}`,
        qty,
        unitPrice,
        `${deliveryLabel} · ${formatHeadDays(qty)} ${unitLabel} × ${formatMoney(unitPrice)}/${unitLabel} = ${totalLabel}`,
      ),
    );
  }
}

function categoryLine(
  category: BillingCategory,
  description: string,
  quantity: number,
  unitPrice: number,
  detail?: string,
): BillingLinePreview {
  return {
    description,
    quantity,
    unitPrice,
    category,
    detail,
    source:
      category === "yardage"
        ? "yardage"
        : category === "pasture"
          ? "pasture"
          : category === "treatments"
            ? "treatment"
            : category === "feed"
              ? "feeding"
              : "misc",
  };
}

export async function buildBillingPreview(
  orgId: string,
  ownerId: string,
  periodStart: string,
  periodEnd: string,
  options?: { extraMiscLines?: Array<{ description: string; amount: number }> },
): Promise<BillingPreview | { error: string }> {
  const owner = await getOwner(orgId, ownerId);
  if (!owner) return { error: "Owner not found" };
  if (owner.is_ownership_group) {
    return { error: "Select an individual owner — groups split billing to members" };
  }
  if (periodEnd < periodStart) {
    return { error: "End date must be on or after start date" };
  }

  const dayCount = daysInclusive(periodStart, periodEnd);
  const periodLabel = monthLabel(periodStart, periodEnd);
  const supabase = await createClient();
  const lotShares = await resolveOwnerLotShares(orgId, ownerId);
  const groupIds = [...new Set(lotShares.map((l) => l.groupId))];

  const warnings: string[] = [];
  const treatmentIds: string[] = [];
  const feedingRecordIds: string[] = [];
  const processingEventIds: string[] = [];
  const mortalityRecordIds: string[] = [];
  const miscChargeIds: string[] = [];

  let yardageTotal = 0;
  let pastureTotal = 0;
  let treatmentsTotal = 0;
  let feedTotal = 0;
  let processingTotal = 0;
  let miscTotal = 0;
  let deadCount = 0;
  const feedByRation = new Map<string, FeedRationRollup>();

  const headDaysBreakdown: GroupHeadDaysBreakdown[] = [];
  let totalHeadDays = 0;

  if (groupIds.length === 0) {
    warnings.push("No cattle groups linked to this owner — assign an owner on each lot in Cattle.");
  }

  const yardageRate = owner.yardage_rate_per_head_day;
  const pastureRate = owner.pasture_rate_per_head_day;

  const billingModes = await loadOrgBillingModes(orgId);
  const groupLocationById = new Map<string, string | null>();

  if (groupIds.length > 0) {
    const { data: groupRows } = await supabase
      .from("cattle_groups")
      .select("id, location_id")
      .eq("organization_id", orgId)
      .in("id", groupIds);

    for (const g of groupRows ?? []) {
      groupLocationById.set(g.id, g.location_id);
    }
  }

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
    const scaledHeadDays = roundMoney(head.headDays * lot.share);
    totalHeadDays += scaledHeadDays;

    const locationId = groupLocationById.get(lot.groupId) ?? null;
    const billing = billingModes.resolveForLocationId(locationId);
    const scaledPasture =
      billing.mode === "pasture" ? scaledHeadDays : 0;
    const scaledYardage =
      billing.mode === "yardage" ? scaledHeadDays : 0;

    pastureHeadDays += scaledPasture;
    yardageHeadDays += scaledYardage;

    if (!locationId) {
      warnings.push(`${lot.groupName}: no pen assigned — billed as yardage.`);
    }

    headDaysBreakdown.push({
      groupId: lot.groupId,
      groupName: lot.groupName,
      headDays: scaledHeadDays,
      pastureHeadDays: scaledPasture,
      yardageHeadDays: scaledYardage,
      avgHead: roundMoney(head.avgHead * lot.share),
      headAtStart: head.headAtStart,
      headAtEnd: head.headAtEnd,
      billingMode: billing.mode,
      locationId: billing.locationId,
      locationName: billing.locationName,
      ownerShare: lot.share,
    });

    if (billing.mode === "pasture" && pastureRate != null && pastureRate > 0 && scaledPasture > 0) {
      pastureTotal += roundMoney(scaledPasture * pastureRate);
    }
    if (billing.mode === "yardage" && yardageRate != null && yardageRate > 0 && scaledYardage > 0) {
      yardageTotal += roundMoney(scaledYardage * yardageRate);
    }
  }

  const totalHead =
    dayCount > 0 ? Math.round((totalHeadDays / dayCount) * 100) / 100 : 0;

  if (yardageHeadDays > 0 && yardageRate == null) {
    warnings.push("No yardage rate on owner — set one in Setup → Owners.");
  }
  if (pastureHeadDays > 0 && pastureRate == null) {
    warnings.push("No pasture rate on owner — set one in Setup → Owners.");
  }

  if (groupIds.length > 0) {
    const shareByGroup = new Map(lotShares.map((l) => [l.groupId, l.share]));

    const primaryRes = await supabase
      .from("treatment_records")
      .select(
        "id, product_name, treatment_date, cattle_group_id, medicine_item_id, quantity_used, invoiced_at",
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("treatment_date", periodStart)
      .lte("treatment_date", periodEnd)
      .in("cattle_group_id", groupIds)
      .is("invoiced_at", null)
      .order("treatment_date");

    let treatments: TreatmentBillingRow[] = primaryRes.data ?? [];
    if (primaryRes.error?.message.includes("invoiced_at")) {
      warnings.push("Run supabase/RUN_PHASE33.sql to prevent double-billing treatments.");
      const fallback = await supabase
        .from("treatment_records")
        .select(
          "id, product_name, treatment_date, cattle_group_id, medicine_item_id, quantity_used",
        )
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .gte("treatment_date", periodStart)
        .lte("treatment_date", periodEnd)
        .in("cattle_group_id", groupIds);
      treatments = fallback.data ?? [];
    }

    const medicineIds = [
      ...new Set((treatments ?? []).map((t) => t.medicine_item_id).filter(Boolean)),
    ] as string[];

    const { data: medicines } = medicineIds.length
      ? await supabase
          .from("medicine_items")
          .select("id, price_per_cc, avg_unit_cost")
          .in("id", medicineIds)
      : { data: [] };

    const medCosts = new Map(
      (medicines ?? []).map((m) => {
        const avg =
          (m as { avg_unit_cost?: number | null }).avg_unit_cost != null
            ? Number((m as { avg_unit_cost?: number | null }).avg_unit_cost)
            : m.price_per_cc != null
              ? Number(m.price_per_cc)
              : null;
        return [m.id, avg];
      }),
    );

    const markup = owner.medicine_markup_percent ?? 0;

    for (const t of treatments) {
      if (!t.medicine_item_id || t.quantity_used == null || !t.cattle_group_id) continue;
      const avgCost = medCosts.get(t.medicine_item_id);
      if (avgCost == null) {
        warnings.push(`${t.product_name ?? "Treatment"}: no medicine cost — receive stock with cost.`);
        continue;
      }
      const unitPrice = medicineBillableUnitPrice(avgCost, markup);
      const share = shareByGroup.get(t.cattle_group_id) ?? 1;
      treatmentsTotal += roundMoney(Number(t.quantity_used) * unitPrice * share);
      treatmentIds.push(t.id as string);
    }

    const feedRes = await supabase
      .from("feeding_records")
      .select(
        "id, fed_at, cattle_group_id, feed_ration_id, quantity, invoiced_at, feeding_context, unit_cost_snapshot",
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .eq("feeding_context", "general")
      .gte("fed_at", periodStart)
      .lte("fed_at", periodEnd)
      .in("cattle_group_id", groupIds)
      .is("invoiced_at", null)
      .order("fed_at");

    let feedings = feedRes.data ?? [];
    if (feedRes.error?.message.includes("invoiced_at")) {
      warnings.push("Run supabase/RUN_PHASE10.sql to prevent double-billing feed.");
    }

    const rationIds = [...new Set(feedings.map((f) => f.feed_ration_id).filter(Boolean))];
    const { data: rations } = rationIds.length
      ? await supabase.from("feed_rations").select("id, name, price_per_unit, unit").in("id", rationIds)
      : { data: [] };
    const rationPrices = new Map(
      (rations ?? []).map((r) => [
        r.id,
        r.price_per_unit != null ? Number(r.price_per_unit) : null,
      ]),
    );
    const rationUnits = new Map((rations ?? []).map((r) => [r.id, r.unit ?? "lb"]));
    const rationNames = new Map(
      (rations ?? []).map((r) => [r.id, (r.name as string | null)?.trim() || "Feed ration"]),
    );

    const missingPriceLookups = feedings
      .filter((f) => f.unit_cost_snapshot == null)
      .map((f) => ({ rationId: f.feed_ration_id, asOfDate: f.fed_at }));
    const historicalPrices = await getRationUnitPricesAtDates(orgId, missingPriceLookups);
    const feedMarkup = owner.feed_markup_percent ?? 0;
    const feedMarkupFactor = 1 + feedMarkup / 100;

    for (const f of feedings) {
      if (!f.feed_ration_id || !f.cattle_group_id) continue;
      const snapshot = f.unit_cost_snapshot != null ? Number(f.unit_cost_snapshot) : null;
      const pricePerUnit =
        snapshot ??
        historicalPrices.get(rationPriceLookupKey(f.feed_ration_id, f.fed_at)) ??
        rationPrices.get(f.feed_ration_id) ??
        null;
      if (pricePerUnit == null) continue;

      const share = shareByGroup.get(f.cattle_group_id) ?? 1;
      const rationId = f.feed_ration_id;
      const rationUnit = rationUnits.get(rationId) ?? "lb";
      const rationName = rationNames.get(rationId) ?? "Feed ration";
      const rollup = getFeedRollup(feedByRation, rationId, rationName, rationUnit);
      const qty = Number(f.quantity) * share;
      const cost = roundMoney(qty * pricePerUnit * feedMarkupFactor);

      feedTotal += cost;
      rollup.totalCost += cost;
      rollup.deliveryCount += 1;
      feedingRecordIds.push(f.id);

      const tons = convertFeedQuantity(qty, rationUnit, "ton");
      if (tons != null) {
        rollup.tons += tons;
      } else {
        rollup.nativeQuantity += qty;
      }
    }

    const procRes = await supabase
      .from("processing_events")
      .select("id, cattle_group_id, chute_charge, labor_charge, processing_fee, medicine_cost, invoiced_at")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("processed_at", periodStart)
      .lte("processed_at", periodEnd)
      .in("cattle_group_id", groupIds)
      .is("invoiced_at", null);

    for (const p of procRes.data ?? []) {
      if (!p.cattle_group_id) continue;
      const share = shareByGroup.get(p.cattle_group_id) ?? 1;
      const eventTotal =
        Number(p.chute_charge ?? 0) +
        Number(p.labor_charge ?? 0) +
        Number(p.processing_fee ?? 0) +
        Number(p.medicine_cost ?? 0);
      processingTotal += roundMoney(eventTotal * share);
      processingEventIds.push(p.id);
    }

    const mortRes = await supabase
      .from("mortality_records")
      .select("id, cattle_group_id, head_count, invoiced_at")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("died_at", periodStart)
      .lte("died_at", periodEnd)
      .in("cattle_group_id", groupIds)
      .is("invoiced_at", null);

    for (const m of mortRes.data ?? []) {
      if (!m.cattle_group_id) continue;
      const share = shareByGroup.get(m.cattle_group_id) ?? 1;
      deadCount += Math.round(Number(m.head_count) * share);
      mortalityRecordIds.push(m.id);
    }
  }

  const miscRes = await supabase
    .from("owner_misc_charges")
    .select("id, amount")
    .eq("organization_id", orgId)
    .eq("owner_id", ownerId)
    .eq("is_active", true)
    .gte("charge_date", periodStart)
    .lte("charge_date", periodEnd)
    .is("invoiced_at", null);

  for (const row of miscRes.data ?? []) {
    miscTotal += roundMoney(Number(row.amount));
    miscChargeIds.push(row.id);
  }

  for (const extra of options?.extraMiscLines ?? []) {
    miscTotal += roundMoney(extra.amount);
  }

  const lines: BillingLinePreview[] = [];
  const feedRollups = [...feedByRation.values()];
  const feedTons =
    feedRollups.reduce((sum, r) => sum + r.tons, 0) > 0
      ? Math.round(feedRollups.reduce((sum, r) => sum + r.tons, 0) * 1000) / 1000
      : null;
  const feedDeliveryCount = feedRollups.reduce((sum, r) => sum + r.deliveryCount, 0);

  if (yardageTotal > 0 && yardageRate != null && yardageRate > 0) {
    const qty = roundMoney(yardageHeadDays);
    const effectiveRate = qty > 0 ? roundMoney(yardageTotal / qty) : yardageRate;
    lines.push(
      categoryLine(
        "yardage",
        `Yardage — ${periodLabel}`,
        qty,
        effectiveRate,
        `${formatHeadDays(qty)} head-days × ${formatMoney(yardageRate)}/day`,
      ),
    );
  }
  if (pastureTotal > 0 && pastureRate != null && pastureRate > 0) {
    const qty = roundMoney(pastureHeadDays);
    const effectiveRate = qty > 0 ? roundMoney(pastureTotal / qty) : pastureRate;
    lines.push(
      categoryLine(
        "pasture",
        `Pasture — ${periodLabel}`,
        qty,
        effectiveRate,
        `${formatHeadDays(qty)} head-days × ${formatMoney(pastureRate)}/day`,
      ),
    );
  }
  if (treatmentsTotal > 0) {
    const count = treatmentIds.length;
    lines.push(
      categoryLine(
        "treatments",
        `Treatments — ${periodLabel}`,
        1,
        treatmentsTotal,
        `${count} treatment${count === 1 ? "" : "s"} · ${formatMoney(treatmentsTotal)}`,
      ),
    );
  }
  if (feedTotal > 0) {
    pushFeedRationLines(lines, feedRollups, periodLabel);
  }
  if (processingTotal > 0) {
    const count = processingEventIds.length;
    lines.push(
      categoryLine(
        "processing",
        `Processing — ${periodLabel}`,
        1,
        processingTotal,
        `${count} processing event${count === 1 ? "" : "s"} · ${formatMoney(processingTotal)}`,
      ),
    );
  }
  if (miscTotal > 0) {
    lines.push(
      categoryLine(
        "misc",
        `Misc charges — ${periodLabel}`,
        1,
        miscTotal,
        formatMoney(miscTotal),
      ),
    );
  }
  if (deadCount > 0) {
    lines.push({
      description: `Dead — ${deadCount} head`,
      quantity: deadCount,
      unitPrice: 0,
      category: "dead",
      source: "misc",
    });
  }

  if (lines.length === 0 && warnings.length === 0) {
    warnings.push("No billable charges in this period.");
  }

  const subtotal = roundMoney(
    lines.reduce((s, l) => s + roundMoney(l.quantity * l.unitPrice), 0),
  );

  const billingSnapshot: BillingSnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    ownerId,
    pastureHeadDays: roundMoney(pastureHeadDays),
    yardageHeadDays: roundMoney(yardageHeadDays),
    rates: {
      pasturePerHeadDay: pastureRate,
      yardagePerHeadDay: yardageRate,
    },
    feedSummary:
      feedRollups.length > 0
        ? {
            totalTons: feedTons ?? 0,
            deliveryCount: feedDeliveryCount,
            totalCost: roundMoney(feedTotal),
            rations: feedRollups.map((r) => ({
              rationId: r.rationId,
              rationName: r.rationName,
              tons: r.tons > 0 ? Math.round(r.tons * 1000) / 1000 : null,
              nativeQuantity: Math.round(r.nativeQuantity * 100) / 100,
              unit: r.unit,
              deliveryCount: r.deliveryCount,
              totalCost: roundMoney(r.totalCost),
            })),
          }
        : undefined,
    groups: headDaysBreakdown.map((g) => ({
      groupId: g.groupId,
      groupName: g.groupName,
      share: g.ownerShare,
      headDays: g.headDays,
      pastureHeadDays: g.pastureHeadDays,
      yardageHeadDays: g.yardageHeadDays,
      billingMode: g.billingMode,
      locationId: g.locationId,
      locationName: g.locationName,
    })),
  };

  return {
    ownerId,
    ownerName: owner.name,
    ownerEmail: owner.email,
    ownerAddress: owner.address,
    customerId: ownerId,
    customerName: owner.name,
    customerEmail: owner.email,
    customerAddress: owner.address,
    periodStart,
    periodEnd,
    dayCount,
    totalHead,
    totalHeadDays,
    pastureHeadDays: roundMoney(pastureHeadDays),
    yardageHeadDays: roundMoney(yardageHeadDays),
    pastureRate,
    yardageRate,
    headDaysBreakdown,
    billingSnapshot,
    lines,
    warnings,
    subtotal,
    treatmentIds,
    feedingRecordIds,
    processingEventIds,
    mortalityRecordIds,
    miscChargeIds,
    feedTons,
    feedDeliveryCount,
  };
}

/** Backward-compatible alias */
export const buildBillingPreviewForCustomer = buildBillingPreview;
