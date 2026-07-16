import { createClient } from "@/lib/supabase/server";
import {
  calculateCowCalfInventory,
  reconcileMixedHerdCounts,
  type CowCalfAnimalSnapshot,
  type DamCalfRelationshipSnapshot,
} from "./inventory-calculations";
import type { CalfRecord, CowCalfHerd, HerdInventorySummary } from "./herd-types";

const DB_HINT = "Run supabase db push to apply Phase 35 Cow-Calf enterprise migration.";

function formatDbError(message: string): string {
  if (
    message.includes("cow_calf_herds") ||
    message.includes("dam_calf_relationships") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

type HerdRow = {
  id: string;
  organization_id: string;
  name: string;
  owner_id: string | null;
  current_location_id: string | null;
  status: string;
  description: string | null;
  breeding_season: string | null;
  calving_season: string | null;
  recordkeeping_mode: string;
  group_cows_count: number;
  group_calves_at_side_count: number;
  group_bulls_count: number;
  group_replacements_count: number;
  created_at: string;
  updated_at: string;
};

async function enrichHerds(orgId: string, rows: HerdRow[]): Promise<CowCalfHerd[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.current_location_id).filter(Boolean))] as string[];

  const [{ data: owners }, { data: locations }] = await Promise.all([
    ownerIds.length
      ? supabase.from("owners").select("id, name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.name]));
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));

  return rows.map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    owner_id: row.owner_id,
    owner_name: row.owner_id ? ownerMap.get(row.owner_id) ?? null : null,
    current_location_id: row.current_location_id,
    location_name: row.current_location_id ? locMap.get(row.current_location_id) ?? null : null,
    status: row.status as CowCalfHerd["status"],
    description: row.description,
    breeding_season: row.breeding_season,
    calving_season: row.calving_season,
    recordkeeping_mode: row.recordkeeping_mode as CowCalfHerd["recordkeeping_mode"],
    group_cows_count: Number(row.group_cows_count ?? 0),
    group_calves_at_side_count: Number(row.group_calves_at_side_count ?? 0),
    group_bulls_count: Number(row.group_bulls_count ?? 0),
    group_replacements_count: Number(row.group_replacements_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function listCowCalfHerds(orgId: string): Promise<CowCalfHerd[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cow_calf_herds")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(formatDbError(error.message));
  return enrichHerds(orgId, (data ?? []) as HerdRow[]);
}

export async function getCowCalfHerd(orgId: string, id: string): Promise<CowCalfHerd | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cow_calf_herds")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!data) return null;
  const [herd] = await enrichHerds(orgId, [data as HerdRow]);
  return herd ?? null;
}

async function loadHerdAnimalSnapshots(
  orgId: string,
  herdId?: string,
): Promise<{ animals: CowCalfAnimalSnapshot[]; relationships: DamCalfRelationshipSnapshot[] }> {
  const supabase = await createClient();

  let animalQuery = supabase
    .from("individual_animals")
    .select("id, animal_type, status, reproductive_status, calf_lifecycle_status, cow_calf_herd_id")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf")
    .eq("is_active", true);

  if (herdId) {
    animalQuery = animalQuery.eq("cow_calf_herd_id", herdId);
  }

  const { data: animals, error: animalError } = await animalQuery;
  if (animalError) throw new Error(formatDbError(animalError.message));

  const { data: relationships, error: relError } = await supabase
    .from("dam_calf_relationships")
    .select("dam_id, calf_id, nursing_status, fostered, is_active")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (relError) throw new Error(formatDbError(relError.message));

  const animalSnapshots: CowCalfAnimalSnapshot[] = (animals ?? []).map((a) => ({
    id: a.id,
    role: mapAnimalRole(a.animal_type),
    lifecycleStatus: a.status as CowCalfAnimalSnapshot["lifecycleStatus"],
    reproductiveStatus: a.reproductive_status as CowCalfAnimalSnapshot["reproductiveStatus"],
    calfLifecycleStatus: a.calf_lifecycle_status as CowCalfAnimalSnapshot["calfLifecycleStatus"],
  }));

  const relSnapshots: DamCalfRelationshipSnapshot[] = (relationships ?? []).map((r) => ({
    damId: r.dam_id,
    calfId: r.calf_id,
    nursingStatus: r.nursing_status as DamCalfRelationshipSnapshot["nursingStatus"],
    fostered: r.fostered,
    isActive: r.is_active,
  }));

  return { animals: animalSnapshots, relationships: relSnapshots };
}

function mapAnimalRole(animalType: string): CowCalfAnimalSnapshot["role"] {
  switch (animalType) {
    case "cow":
      return "cow";
    case "heifer":
      return "heifer";
    case "bull":
      return "bull";
    default:
      return "other";
  }
}

export async function getHerdInventorySummary(
  orgId: string,
  herd: CowCalfHerd,
): Promise<HerdInventorySummary> {
  const { animals, relationships } = await loadHerdAnimalSnapshots(orgId, herd.id);

  const identifiedCows = animals.filter((a) => a.role === "cow" || a.role === "heifer").length;
  const calfIdsAtSide = new Set(
    animals
      .filter((a) => a.role === "calf" || a.calfLifecycleStatus === "at_side")
      .map((a) => a.id),
  );
  const identifiedCalvesAtSide = relationships.filter(
    (r) => r.nursingStatus === "at_side" && calfIdsAtSide.has(r.calfId),
  ).length;

  const groupCounts =
    herd.recordkeeping_mode === "individual"
      ? { groupCows: 0, groupCalvesAtSide: 0, groupBulls: 0, groupReplacements: 0 }
      : reconcileMixedHerdCounts(
          {
            groupCows: herd.group_cows_count,
            groupCalvesAtSide: herd.group_calves_at_side_count,
            groupBulls: herd.group_bulls_count,
            groupReplacements: herd.group_replacements_count,
          },
          herd.recordkeeping_mode === "mixed" ? identifiedCows : 0,
          herd.recordkeeping_mode === "mixed" ? identifiedCalvesAtSide : 0,
        );

  const totals = calculateCowCalfInventory({
    animals,
    relationships,
    groupCounts: {
      groupCows: groupCounts.groupCows,
      groupCalvesAtSide: groupCounts.groupCalvesAtSide,
      groupBulls: groupCounts.groupBulls,
      groupReplacements: groupCounts.groupReplacements,
    },
  });

  return { herdId: herd.id, ...totals };
}

export async function getEnterpriseInventorySummary(orgId: string): Promise<HerdInventorySummary & { herdCount: number }> {
  const herds = await listCowCalfHerds(orgId);
  const summaries = await Promise.all(herds.map((h) => getHerdInventorySummary(orgId, h)));

  const aggregate = summaries.reduce(
    (acc, s) => ({
      cows: acc.cows + s.cows,
      calvesAtSide: acc.calvesAtSide + s.calvesAtSide,
      pairs: acc.pairs + s.pairs,
      bulls: acc.bulls + s.bulls,
      replacements: acc.replacements + s.replacements,
      totalPhysicalHead: acc.totalPhysicalHead + s.totalPhysicalHead,
      individuallyIdentified: acc.individuallyIdentified + s.individuallyIdentified,
      groupOnlyCows: acc.groupOnlyCows + s.groupOnlyCows,
      groupOnlyCalvesAtSide: acc.groupOnlyCalvesAtSide + s.groupOnlyCalvesAtSide,
    }),
    {
      cows: 0,
      calvesAtSide: 0,
      pairs: 0,
      bulls: 0,
      replacements: 0,
      totalPhysicalHead: 0,
      individuallyIdentified: 0,
      groupOnlyCows: 0,
      groupOnlyCalvesAtSide: 0,
    },
  );

  return { herdId: "enterprise", herdCount: herds.length, ...aggregate };
}

export async function listCalves(orgId: string): Promise<CalfRecord[]> {
  const supabase = await createClient();

  const { data: calvingRows, error: calvingError } = await supabase
    .from("calving_records")
    .select("id, calf_id, calf_tag, dam_id, dam_tag, sire_tag, calf_sex, birth_weight_lbs, outcome, calved_at, cow_calf_herd_id")
    .eq("organization_id", orgId)
    .eq("calving_context", "cow_calf")
    .eq("is_active", true)
    .order("calved_at", { ascending: false });

  if (calvingError) throw new Error(formatDbError(calvingError.message));

  const { data: calfAnimals, error: animalError } = await supabase
    .from("individual_animals")
    .select("id, tag_number, name, birth_date, dam_id, sire_tag, cow_calf_herd_id, location_id, calf_lifecycle_status, sex")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf")
    .eq("is_active", true)
    .in("animal_type", ["other"])
    .order("tag_number");

  if (animalError && !animalError.message.includes("calf_lifecycle_status")) {
    throw new Error(formatDbError(animalError.message));
  }

  const herdIds = new Set<string>();
  const locationIds = new Set<string>();
  const damIds = new Set<string>();

  for (const row of calvingRows ?? []) {
    if (row.cow_calf_herd_id) herdIds.add(row.cow_calf_herd_id);
    if (row.dam_id) damIds.add(row.dam_id);
  }
  for (const row of calfAnimals ?? []) {
    if (row.cow_calf_herd_id) herdIds.add(row.cow_calf_herd_id);
    if (row.location_id) locationIds.add(row.location_id);
    if (row.dam_id) damIds.add(row.dam_id);
  }

  const [{ data: herds }, { data: locations }, { data: dams }] = await Promise.all([
    herdIds.size
      ? supabase.from("cow_calf_herds").select("id, name").in("id", [...herdIds])
      : Promise.resolve({ data: [] }),
    locationIds.size
      ? supabase.from("locations").select("id, name").in("id", [...locationIds])
      : Promise.resolve({ data: [] }),
    damIds.size
      ? supabase.from("individual_animals").select("id, tag_number").in("id", [...damIds])
      : Promise.resolve({ data: [] }),
  ]);

  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const damMap = new Map((dams ?? []).map((d) => [d.id, d.tag_number]));

  const byCalfId = new Map<string, CalfRecord>();

  for (const row of calvingRows ?? []) {
    const calfId = row.calf_id ?? `calving-${row.id}`;
    byCalfId.set(calfId, {
      id: calfId,
      tag_number: row.calf_tag ?? "—",
      name: null,
      sex: row.calf_sex,
      birth_date: row.calved_at,
      birth_weight_lbs: row.birth_weight_lbs != null ? Number(row.birth_weight_lbs) : null,
      dam_id: row.dam_id,
      dam_tag: row.dam_tag ?? (row.dam_id ? damMap.get(row.dam_id) ?? null : null),
      sire_tag: row.sire_tag,
      herd_id: row.cow_calf_herd_id,
      herd_name: row.cow_calf_herd_id ? herdMap.get(row.cow_calf_herd_id) ?? null : null,
      location_name: null,
      calf_lifecycle_status: row.outcome === "live" ? "at_side" : "deceased",
      calving_record_id: row.id,
      outcome: row.outcome,
    });
  }

  for (const row of calfAnimals ?? []) {
    const existing = byCalfId.get(row.id);
    byCalfId.set(row.id, {
      id: row.id,
      tag_number: row.tag_number,
      name: row.name,
      sex: row.sex,
      birth_date: row.birth_date,
      birth_weight_lbs: existing?.birth_weight_lbs ?? null,
      dam_id: row.dam_id,
      dam_tag: row.dam_id ? damMap.get(row.dam_id) ?? null : null,
      sire_tag: row.sire_tag,
      herd_id: row.cow_calf_herd_id,
      herd_name: row.cow_calf_herd_id ? herdMap.get(row.cow_calf_herd_id) ?? null : null,
      location_name: row.location_id ? locMap.get(row.location_id) ?? null : null,
      calf_lifecycle_status: row.calf_lifecycle_status ?? existing?.calf_lifecycle_status ?? null,
      calving_record_id: existing?.calving_record_id ?? null,
      outcome: existing?.outcome ?? null,
    });
  }

  return [...byCalfId.values()];
}
