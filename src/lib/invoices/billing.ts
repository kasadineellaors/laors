import { createClient } from "@/lib/supabase/server";
import { getCustomer } from "@/lib/customers/queries";
import { computeCustomerHeadDays } from "@/lib/invoices/head-days";
import {
  getRationUnitPricesAtDates,
  rationPriceLookupKey,
} from "@/lib/feed/inventory-queries";
import type { BillingLinePreview, BillingPreview, GroupHeadDaysBreakdown } from "./types";

function daysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  return Math.max(0, diff);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function buildBillingPreview(
  orgId: string,
  customerId: string,
  periodStart: string,
  periodEnd: string,
): Promise<BillingPreview | { error: string }> {
  const customer = await getCustomer(orgId, customerId);
  if (!customer) return { error: "Customer not found" };
  if (periodEnd < periodStart) {
    return { error: "End date must be on or after start date" };
  }

  const dayCount = daysInclusive(periodStart, periodEnd);
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("cattle_groups")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .eq("is_active", true);

  const groupIds = (groups ?? []).map((g) => g.id);
  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const headDaysResult = await computeCustomerHeadDays(orgId, customerId, periodStart, periodEnd);
  const totalHead = headDaysResult.avgHead;
  const totalHeadDays = headDaysResult.totalHeadDays;
  const headDaysBreakdown: GroupHeadDaysBreakdown[] = headDaysResult.groups.map((g) => ({
    groupId: g.groupId,
    groupName: g.groupName,
    headDays: g.headDays,
    avgHead: g.avgHead,
    headAtStart: g.headAtStart,
    headAtEnd: g.headAtEnd,
  }));

  const lines: BillingLinePreview[] = [];
  const warnings: string[] = [];
  const treatmentIds: string[] = [];
  const feedingRecordIds: string[] = [];

  if (groupIds.length === 0) {
    warnings.push(
      "No cattle groups linked to this customer — assign a billing customer on each group in Cattle.",
    );
  }

  const yardageRate = customer.yardage_rate_per_head_day;
  if (yardageRate != null && yardageRate > 0 && totalHeadDays > 0) {
    const avgLabel =
      headDaysBreakdown.length > 1
        ? `avg ${totalHead} head × ${dayCount} days`
        : `${totalHead} avg head × ${dayCount} days`;
    lines.push({
      description: `Yardage — ${avgLabel} (${totalHeadDays} head-days)`,
      quantity: totalHeadDays,
      unitPrice: yardageRate,
      source: "yardage",
    });
  } else if (yardageRate != null && yardageRate > 0 && totalHeadDays === 0) {
    warnings.push("Yardage rate set but no head-days in period on linked groups.");
  } else if (yardageRate == null && totalHeadDays > 0) {
    warnings.push("No yardage rate on customer — set one in Setup → Customers.");
  }

  if (groupIds.length > 0) {
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

    let treatments: Array<{
      id: string;
      product_name: string;
      treatment_date: string;
      cattle_group_id: string | null;
      medicine_item_id: string | null;
      quantity_used: number | null;
    }> | null = primaryRes.data;

    if (primaryRes.error?.message.includes("invoiced_at")) {
      warnings.push("Run supabase/RUN_SHIP.sql to prevent double-billing treatments.");
      const fallbackRes = await supabase
        .from("treatment_records")
        .select(
          "id, product_name, treatment_date, cattle_group_id, medicine_item_id, quantity_used",
        )
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .gte("treatment_date", periodStart)
        .lte("treatment_date", periodEnd)
        .in("cattle_group_id", groupIds)
        .order("treatment_date");
      treatments = fallbackRes.data;
    }

    const medicineIds = [
      ...new Set((treatments ?? []).map((t) => t.medicine_item_id).filter(Boolean)),
    ] as string[];

    const { data: medicines } = medicineIds.length
      ? await supabase
          .from("medicine_items")
          .select("id, price_per_cc")
          .in("id", medicineIds)
      : { data: [] };

    const medPrices = new Map(
      (medicines ?? []).map((m) => [m.id, m.price_per_cc != null ? Number(m.price_per_cc) : null]),
    );

    const markup = customer.medicine_markup_percent ?? 0;
    const markupFactor = 1 + markup / 100;

    for (const t of treatments ?? []) {
      if (!t.medicine_item_id || t.quantity_used == null) continue;

      const pricePerCc = medPrices.get(t.medicine_item_id);
      if (pricePerCc == null) {
        warnings.push(
          `${t.product_name} (${t.treatment_date}): no catalog price/cc — set in Medicine catalog.`,
        );
        continue;
      }

      const unitPrice = roundMoney(pricePerCc * markupFactor);
      const groupName = t.cattle_group_id ? groupNames.get(t.cattle_group_id) : null;
      const markupNote = markup > 0 ? ` incl. ${markup}% markup` : "";

      lines.push({
        description: `${t.product_name}${groupName ? ` — ${groupName}` : ""} (${t.treatment_date})${markupNote}`,
        quantity: Number(t.quantity_used),
        unitPrice,
        source: "treatment",
        treatmentId: t.id as string,
      });
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

    let feedings: Array<{
      id: string;
      fed_at: string;
      cattle_group_id: string | null;
      feed_ration_id: string;
      quantity: number;
      unit_cost_snapshot?: number | null;
    }> | null = feedRes.data;

    if (feedRes.error?.message.includes("feeding_records")) {
      feedings = [];
    } else if (
      feedRes.error?.message.includes("feeding_context") ||
      feedRes.error?.message.includes("invoiced_at")
    ) {
      if (feedRes.error.message.includes("invoiced_at")) {
        warnings.push("Run supabase/RUN_PHASE10.sql to prevent double-billing feed.");
      }
      const fallbackFeed = await supabase
        .from("feeding_records")
        .select("id, fed_at, cattle_group_id, feed_ration_id, quantity")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .gte("fed_at", periodStart)
        .lte("fed_at", periodEnd)
        .in("cattle_group_id", groupIds)
        .order("fed_at");
      feedings = fallbackFeed.data;
    }

    const rationIds = [
      ...new Set((feedings ?? []).map((f) => f.feed_ration_id).filter(Boolean)),
    ] as string[];

    const { data: rations } = rationIds.length
      ? await supabase.from("feed_rations").select("id, name, unit, price_per_unit").in("id", rationIds)
      : { data: [] };

    const rationPrices = new Map(
      (rations ?? []).map((r) => [
        r.id,
        r.price_per_unit != null ? Number(r.price_per_unit) : null,
      ]),
    );
    const rationNames = new Map((rations ?? []).map((r) => [r.id, { name: r.name, unit: r.unit }]));

    const missingPriceLookups = (feedings ?? [])
      .filter((f) => f.unit_cost_snapshot == null)
      .map((f) => ({ rationId: f.feed_ration_id, asOfDate: f.fed_at }));
    const historicalPrices = await getRationUnitPricesAtDates(orgId, missingPriceLookups);

    const feedMarkup = customer.feed_markup_percent ?? 0;
    const feedMarkupFactor = 1 + feedMarkup / 100;

    for (const f of feedings ?? []) {
      const snapshot =
        f.unit_cost_snapshot != null ? Number(f.unit_cost_snapshot) : null;
      const pricePerUnit =
        snapshot ??
        historicalPrices.get(rationPriceLookupKey(f.feed_ration_id, f.fed_at)) ??
        rationPrices.get(f.feed_ration_id) ??
        null;
      const ration = rationNames.get(f.feed_ration_id);
      if (pricePerUnit == null) {
        warnings.push(
          `${ration?.name ?? "Feed"} (${f.fed_at}): no ration price — set in Feed → Rations.`,
        );
        continue;
      }

      const unitPrice = roundMoney(pricePerUnit * feedMarkupFactor);
      const groupName = f.cattle_group_id ? groupNames.get(f.cattle_group_id) : null;
      const markupNote = feedMarkup > 0 ? ` incl. ${feedMarkup}% markup` : "";
      const unitLabel = ration?.unit ?? "unit";

      lines.push({
        description: `Feed — ${ration?.name ?? "Ration"}${groupName ? ` — ${groupName}` : ""} (${f.fed_at}, ${Number(f.quantity)} ${unitLabel})${markupNote}`,
        quantity: Number(f.quantity),
        unitPrice,
        source: "feeding",
        feedingRecordId: f.id,
      });
      feedingRecordIds.push(f.id);
    }
  }

  if (lines.length === 0 && warnings.length === 0) {
    warnings.push("No billable yardage, treatments, or feed in this period.");
  }

  const subtotal = roundMoney(
    lines.reduce((s, l) => s + roundMoney(l.quantity * l.unitPrice), 0),
  );

  return {
    customerId,
    customerName: customer.name,
    customerEmail: customer.email,
    customerAddress: customer.address,
    periodStart,
    periodEnd,
    dayCount,
    totalHead,
    totalHeadDays,
    headDaysBreakdown,
    lines,
    warnings,
    subtotal,
    treatmentIds,
    feedingRecordIds,
  };
}
