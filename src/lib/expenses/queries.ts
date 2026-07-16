import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LotExpenseRecord } from "./types";

export async function listLotExpenses(
  orgId: string,
  groupId: string,
  supabaseClient?: SupabaseClient<Database>,
): Promise<LotExpenseRecord[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data: rows } = await supabase
    .from("lot_expenses")
    .select("*")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true)
    .order("expense_date", { ascending: false });

  if (!rows?.length) return [];

  const categoryIds = [
    ...new Set(rows.map((r) => r.financial_category_id).filter(Boolean)),
  ] as string[];

  const { data: categories } = categoryIds.length
    ? await supabase.from("financial_categories").select("id, name").in("id", categoryIds)
    : { data: [] };

  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    id: r.id,
    cattle_group_id: r.cattle_group_id,
    financial_category_id: r.financial_category_id,
    category_name: r.financial_category_id
      ? categoryName.get(r.financial_category_id) ?? null
      : null,
    expense_date: r.expense_date,
    amount: Number(r.amount),
    description: r.description,
    vendor_name: r.vendor_name,
    notes: r.notes,
    created_at: r.created_at,
  }));
}

export async function sumLotExpenses(
  orgId: string,
  groupId: string,
  supabaseClient?: SupabaseClient<Database>,
): Promise<number> {
  const expenses = await listLotExpenses(orgId, groupId, supabaseClient);
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
