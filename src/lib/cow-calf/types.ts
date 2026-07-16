export type CalvingContext = "cow_calf" | "seedstock";
export type AssistanceType = "unassisted" | "easy_pull" | "hard_pull" | "c_section" | "unknown";
export type LossCause = "calving_difficulty" | "disease" | "environmental" | "unknown";

import type { TwinStatus } from "./calving-alerts";

export interface CalvingRecord {
  id: string;
  calved_at: string;
  calving_context: CalvingContext;
  location_id: string | null;
  location_name: string | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  cow_calf_herd_id: string | null;
  herd_name: string | null;
  dam_id: string | null;
  dam_tag: string | null;
  bull_id: string | null;
  sire_tag: string | null;
  calf_tag: string | null;
  calf_id: string | null;
  calf_sex: CalfSex;
  birth_weight_lbs: number | null;
  outcome: CalvingOutcome;
  calving_ease_score: number | null;
  assistance_type: AssistanceType | null;
  loss_cause: LossCause | null;
  breeding_record_id: string | null;
  calving_event_id: string | null;
  twin_status: TwinStatus | null;
  fostered: boolean;
  classification_id: string | null;
  classification_name: string | null;
  add_to_inventory: boolean;
  inventory_added: boolean;
  notes: string | null;
}

export interface CalvingSummary {
  total: number;
  live: number;
  thisMonth: number;
}

export type CalfSex = "bull_calf" | "heifer_calf" | "unknown";
export type CalvingOutcome = "live" | "stillborn" | "died";

export interface BullRecord {
  id: string;
  tag_number: string;
  name: string | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  location_id: string | null;
  location_name: string | null;
  status: "active" | "sold" | "dead" | "archived";
  birth_date: string | null;
  notes: string | null;
}

export type CowAnimalType = "cow" | "heifer";

export interface CowRecord extends BullRecord {
  animal_type: CowAnimalType;
}

export interface CowSummary {
  total: number;
  active: number;
  cows: number;
  heifers: number;
}

export interface ClassificationOption {
  id: string;
  name: string;
  short_code: string | null;
}
