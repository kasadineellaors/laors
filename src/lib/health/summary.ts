import { createClient } from "@/lib/supabase/server";
import { listMedicineItems } from "@/lib/medicine/queries";

export interface HealthSummary {
  treatmentsThisMonth: number;
  headTreatedThisMonth: number;
  activeWithdrawals: number;
  medicineProducts: number;
  lowStockMedicines: number;
  outOfStockMedicines: number;
  hasWithdrawalData: boolean;
}

export async function getHealthSummary(orgId: string): Promise<HealthSummary> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [treatmentsResult, withdrawalResult, items] = await Promise.all([
    supabase
      .from("treatment_records")
      .select("head_count, treatment_date")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("treatment_date", monthStart),
    supabase
      .from("treatment_records")
      .select("id, withdrawal_until")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("withdrawal_until", today),
    listMedicineItems(orgId),
  ]);

  const monthRows = treatmentsResult.data ?? [];
  const headTreated = monthRows.reduce((sum, r) => sum + (r.head_count ?? 0), 0);

  const hasWithdrawalData = !withdrawalResult.error;
  const activeWithdrawals = hasWithdrawalData ? (withdrawalResult.data?.length ?? 0) : 0;

  const lowStock = items.filter((i) => i.is_low_stock).length;
  const outOfStock = items.filter((i) => i.is_out_of_stock).length;

  return {
    treatmentsThisMonth: monthRows.length,
    headTreatedThisMonth: headTreated,
    activeWithdrawals,
    medicineProducts: items.length,
    lowStockMedicines: lowStock,
    outOfStockMedicines: outOfStock,
    hasWithdrawalData,
  };
}
