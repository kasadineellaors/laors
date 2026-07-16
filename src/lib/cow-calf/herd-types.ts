export type HerdStatus = "active" | "archived" | "closed";
export type RecordkeepingMode = "individual" | "group" | "mixed";

export interface CowCalfHerd {
  id: string;
  organization_id: string;
  name: string;
  owner_id: string | null;
  owner_name: string | null;
  current_location_id: string | null;
  location_name: string | null;
  status: HerdStatus;
  description: string | null;
  breeding_season: string | null;
  calving_season: string | null;
  recordkeeping_mode: RecordkeepingMode;
  group_cows_count: number;
  group_calves_at_side_count: number;
  group_bulls_count: number;
  group_replacements_count: number;
  created_at: string;
  updated_at: string;
}

export interface HerdInventorySummary {
  herdId: string;
  cows: number;
  calvesAtSide: number;
  pairs: number;
  bulls: number;
  replacements: number;
  totalPhysicalHead: number;
  individuallyIdentified: number;
  groupOnlyCows: number;
  groupOnlyCalvesAtSide: number;
}

export interface CalfRecord {
  id: string;
  tag_number: string;
  name: string | null;
  sex: string | null;
  birth_date: string | null;
  birth_weight_lbs: number | null;
  dam_id: string | null;
  dam_tag: string | null;
  sire_tag: string | null;
  herd_id: string | null;
  herd_name: string | null;
  location_name: string | null;
  calf_lifecycle_status: string | null;
  calving_record_id: string | null;
  outcome: string | null;
}

export interface ForemanSummaryItem {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  href?: string;
}
