import { createClient } from "@/lib/supabase/server";
import { getCustomer } from "@/lib/customers/queries";
import type { BillingLinePreview, BillingPreview } from "./types";

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

  let totalHead = 0;
  if (groupIds.length > 0) {
    const { data: counts } = await supabase
      .from("group_inventory_counts")
      .select("head_count")
      .eq("organization_id", orgId)
      .in("cattle_group_id", groupIds);

    totalHead = (counts ?? []).reduce((s, c) => s + c.head_count, 0);
  }

  const lines: BillingLinePreview[] = [];
  const warnings: string[] = [];
  const treatmentIds: string[] = [];

  if (groupIds.length === 0) {
    warnings.push(
      "No cattle groups linked to this customer — assign a billing customer on each group in Cattle.",
    );
  }

  const yardageRate = customer.yardage_rate_per_head_day;
  if (yardageRate != null && yardageRate > 0 && totalHead > 0 && dayCount > 0) {
    const headDays = totalHead * dayCount;
    lines.push({
      description: `Yardage — ${totalHead} head × ${dayCount} days`,
      quantity: headDays,
      unitPrice: yardageRate,
      source: "yardage",
    });
  } else if (yardageRate != null && yardageRate > 0 && totalHead === 0) {
    warnings.push("Yardage rate set but no head on linked groups.");
  } else if (yardageRate == null && totalHead > 0) {
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
  }

  if (lines.length === 0 && warnings.length === 0) {
    warnings.push("No billable yardage or treatments in this period.");
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
    lines,
    warnings,
    subtotal,
    treatmentIds,
  };
}
