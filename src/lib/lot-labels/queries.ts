import { createClient } from "@/lib/supabase/server";
import type { SelectOption } from "@/lib/locations/options";

export async function listLotLabelOptions(orgId: string): Promise<SelectOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lot_labels")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) {
    if (error.message.includes("lot_labels") || error.message.includes("schema cache")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => ({
    value: row.id,
    label: row.name,
  }));
}
