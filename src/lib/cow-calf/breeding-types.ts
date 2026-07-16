export type BreedingMethod = "natural" | "ai" | "embryo" | "other";
export type PregnancyStatus = "bred" | "confirmed" | "open" | "unknown" | "recheck";
export type BreedingContext = "cow_calf" | "seedstock";

export interface BreedingRecord {
  id: string;
  bred_at: string;
  breeding_context: BreedingContext;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  cow_calf_herd_id: string | null;
  herd_name: string | null;
  location_id: string | null;
  location_name: string | null;
  dam_id: string | null;
  dam_tag: string | null;
  dam_name: string | null;
  bull_id: string | null;
  bull_tag: string | null;
  bull_name: string | null;
  sire_tag: string | null;
  embryo_donor_tag: string | null;
  embryo_recipient_tag: string | null;
  breeding_method: BreedingMethod;
  expected_calving_date: string | null;
  pregnancy_status: PregnancyStatus;
  pregnancy_check_date: string | null;
  notes: string | null;
}

export interface BreedingSummary {
  activeBred: number;
  confirmed: number;
  open: number;
  recheck: number;
  dueNext14Days: number;
  dueNext30Days: number;
  activeExposures: number;
  overduePulls: number;
}
