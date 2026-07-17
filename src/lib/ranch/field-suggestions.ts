import { createClient } from "@/lib/supabase/server";

export type RanchFieldSuggestions = {
  sellers: string[];
  sources: string[];
  suppliers: string[];
  buyers: string[];
};

function uniqueSortedNames(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const name = raw?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function getRanchFieldSuggestions(orgId: string): Promise<RanchFieldSuggestions> {
  const supabase = await createClient();

  const [groupsRes, purchasesRes, expensesRes, salesRes] = await Promise.all([
    supabase
      .from("cattle_groups")
      .select("seller_name, source_name")
      .eq("organization_id", orgId),
    supabase.from("feed_purchases").select("vendor_name").eq("organization_id", orgId),
    supabase.from("lot_expenses").select("vendor_name").eq("organization_id", orgId),
    supabase.from("sales_records").select("buyer_name").eq("organization_id", orgId),
  ]);

  const groups = groupsRes.error ? [] : (groupsRes.data ?? []);
  const purchases = purchasesRes.error ? [] : (purchasesRes.data ?? []);
  const expenses = expensesRes.error ? [] : (expensesRes.data ?? []);
  const sales = salesRes.error ? [] : (salesRes.data ?? []);

  const sellers = uniqueSortedNames(groups.map((g) => g.seller_name));
  const sources = uniqueSortedNames(groups.map((g) => g.source_name));
  const vendors = uniqueSortedNames([
    ...purchases.map((p) => p.vendor_name),
    ...expenses.map((e) => e.vendor_name),
  ]);
  const suppliers = uniqueSortedNames([...vendors, ...sellers]);
  const buyers = uniqueSortedNames(sales.map((s) => s.buyer_name));

  return { sellers, sources, suppliers, buyers };
}
