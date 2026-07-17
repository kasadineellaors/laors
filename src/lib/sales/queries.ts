import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import type { SaleRecord, SalesSummary } from "./types";

export async function listSales(orgId: string, limit = 50): Promise<SaleRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("sales_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];
  return enrichSales(orgId, rows);
}

export async function listArchivedSales(orgId: string, limit = 50): Promise<SaleRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("sales_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", false)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];
  return enrichSales(orgId, rows);
}

export async function getSale(orgId: string, id: string): Promise<SaleRecord | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("sales_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return null;
  const [enriched] = await enrichSales(orgId, [row]);
  return enriched ?? null;
}

export async function getSalesSummary(orgId: string): Promise<SalesSummary> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("sales_records")
    .select("head_count, total_amount")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .gte("sale_date", sinceStr);

  const totalHead = (rows ?? []).reduce((s, r) => s + r.head_count, 0);
  const totalRevenue = (rows ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

  return {
    totalHeadSoldLast30Days: totalHead,
    totalRevenueLast30Days: Math.round(totalRevenue * 100) / 100,
    recordCount: rows?.length ?? 0,
  };
}

async function enrichSales(
  orgId: string,
  rows: Array<Record<string, unknown>>,
): Promise<SaleRecord[]> {
  const supabase = await createClient();

  const groupIds = [...new Set(rows.map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  const categoryIds = [
    ...new Set(rows.map((r) => r.financial_category_id).filter(Boolean)),
  ] as string[];
  const profileIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
  const customerIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))] as string[];
  const animalIds = [
    ...new Set(rows.map((r) => r.individual_animal_id).filter(Boolean)),
  ] as string[];

  const [
    { data: groups },
    { data: locations },
    { data: categories },
    { data: profiles },
    { data: customers },
    { data: animals },
  ] = await Promise.all([
      groupIds.length
        ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
        : Promise.resolve({ data: [] }),
      locationIds.length
        ? supabase.from("locations").select("id, name, parent_id, depth, path").in("id", locationIds)
        : Promise.resolve({ data: [] }),
      categoryIds.length
        ? supabase.from("financial_categories").select("id, name").in("id", categoryIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
        : Promise.resolve({ data: [] }),
      customerIds.length
        ? supabase.from("customers").select("id, name").in("id", customerIds)
        : Promise.resolve({ data: [] }),
      animalIds.length
        ? supabase.from("individual_animals").select("id, tag_number").in("id", animalIds)
        : Promise.resolve({ data: [] }),
    ]);

  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const categoryNames = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const profileNames = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );
  const customerNames = new Map((customers ?? []).map((c) => [c.id, c.name]));
  const animalTags = new Map((animals ?? []).map((a) => [a.id, a.tag_number]));

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

  return rows.map((r) => ({
    id: r.id as string,
    sale_date: r.sale_date as string,
    buyer_name: (r.buyer_name as string | null) ?? null,
    customer_id: (r.customer_id as string | null) ?? null,
    customer_name: r.customer_id ? customerNames.get(r.customer_id as string) ?? null : null,
    individual_animal_id: (r.individual_animal_id as string | null) ?? null,
    individual_animal_tag: r.individual_animal_id
      ? animalTags.get(r.individual_animal_id as string) ?? null
      : null,
    seedstock_sale_type: (r.seedstock_sale_type as SaleRecord["seedstock_sale_type"]) ?? null,
    head_count: r.head_count as number,
    total_amount: r.total_amount != null ? Number(r.total_amount) : null,
    price_per_head: r.price_per_head != null ? Number(r.price_per_head) : null,
    avg_weight_lbs: r.avg_weight_lbs != null ? Number(r.avg_weight_lbs) : null,
    inventory_deducted: Boolean(r.inventory_deducted),
    notes: (r.notes as string | null) ?? null,
    cattle_group_id: (r.cattle_group_id as string | null) ?? null,
    cattle_group_name: r.cattle_group_id
      ? groupNames.get(r.cattle_group_id as string) ?? null
      : null,
    location_id: (r.location_id as string | null) ?? null,
    location_label: r.location_id ? locLabels.get(r.location_id as string) ?? null : null,
    financial_category_id: (r.financial_category_id as string | null) ?? null,
    financial_category_name: r.financial_category_id
      ? categoryNames.get(r.financial_category_id as string) ?? null
      : null,
    created_by: (r.created_by as string | null) ?? null,
    created_by_name: r.created_by ? profileNames.get(r.created_by as string) ?? null : null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

export async function listSeedstockSales(orgId: string, limit = 50): Promise<SaleRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("sales_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .not("individual_animal_id", "is", null)
    .order("sale_date", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];
  return enrichSales(orgId, rows);
}

export async function listSalesForAnimal(orgId: string, animalId: string): Promise<SaleRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("sales_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("individual_animal_id", animalId)
    .eq("is_active", true)
    .order("sale_date", { ascending: false });

  if (error || !rows?.length) return [];
  return enrichSales(orgId, rows);
}
