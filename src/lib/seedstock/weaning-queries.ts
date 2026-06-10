import { createClient } from "@/lib/supabase/server";
import type { WeaningRecord } from "./weaning-types";

const DB_HINT = "Run supabase/RUN_PHASE16.sql or supabase db push, then retry.";

type WeaningRow = {
  id: string;
  calving_record_id: string | null;
  dam_id: string | null;
  calf_id: string | null;
  calf_tag: string | null;
  weaned_at: string;
  weaning_weight_lbs: number | null;
  retained_as_heifer: boolean;
  notes: string | null;
};

async function enrichWeaning(rows: WeaningRow[]): Promise<WeaningRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const damIds = [...new Set(rows.map((r) => r.dam_id).filter(Boolean))] as string[];
  const calfIds = [...new Set(rows.map((r) => r.calf_id).filter(Boolean))] as string[];

  const [{ data: dams }, { data: calves }] = await Promise.all([
    damIds.length
      ? supabase.from("individual_animals").select("id, tag_number, name").in("id", damIds)
      : Promise.resolve({ data: [] }),
    calfIds.length
      ? supabase.from("individual_animals").select("id, tag_number").in("id", calfIds)
      : Promise.resolve({ data: [] }),
  ]);

  const damMap = new Map((dams ?? []).map((d) => [d.id, d]));
  const calfMap = new Map((calves ?? []).map((c) => [c.id, c]));

  return rows.map((r) => {
    const dam = r.dam_id ? damMap.get(r.dam_id) : null;
    const calf = r.calf_id ? calfMap.get(r.calf_id) : null;
    return {
      id: r.id,
      calving_record_id: r.calving_record_id,
      dam_id: r.dam_id,
      dam_tag: dam?.tag_number ?? null,
      dam_name: dam?.name ?? null,
      calf_id: r.calf_id,
      calf_tag: r.calf_tag ?? calf?.tag_number ?? null,
      weaned_at: r.weaned_at,
      weaning_weight_lbs: r.weaning_weight_lbs != null ? Number(r.weaning_weight_lbs) : null,
      retained_as_heifer: Boolean(r.retained_as_heifer),
      notes: r.notes,
    };
  });
}

export async function listWeaningRecords(orgId: string, limit = 100): Promise<WeaningRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weaning_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("weaned_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  return enrichWeaning((data ?? []) as WeaningRow[]);
}

export async function getWeaningForCalving(
  orgId: string,
  calvingId: string,
): Promise<WeaningRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weaning_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("calving_record_id", calvingId)
    .eq("is_active", true)
    .order("weaned_at", { ascending: false });

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  return enrichWeaning((data ?? []) as WeaningRow[]);
}

export async function listOpenCalvingsForWeaning(orgId: string) {
  const supabase = await createClient();
  const { data: calvings, error } = await supabase
    .from("calving_records")
    .select("id, calved_at, dam_tag, calf_tag, calf_sex, dam_id, outcome")
    .eq("organization_id", orgId)
    .eq("calving_context", "seedstock")
    .eq("outcome", "live")
    .eq("is_active", true)
    .order("calved_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);

  const { data: weaned } = await supabase
    .from("weaning_records")
    .select("calving_record_id")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .not("calving_record_id", "is", null);

  const weanedIds = new Set((weaned ?? []).map((w) => w.calving_record_id));

  return (calvings ?? [])
    .filter((c) => !weanedIds.has(c.id))
    .map((c) => ({
      value: c.id as string,
      label: `${c.dam_tag ?? "Dam"} → ${c.calf_tag ?? "Calf"} (${c.calved_at})`,
      damId: (c.dam_id as string | null) ?? null,
      damTag: (c.dam_tag as string | null) ?? null,
      calfTag: (c.calf_tag as string | null) ?? null,
      calfSex: c.calf_sex as string,
      calvedAt: c.calved_at as string,
    }));
}
