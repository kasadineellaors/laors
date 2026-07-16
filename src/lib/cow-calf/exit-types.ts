import type { CalfLifecycleStatus, ReproductiveStatus } from "./inventory-calculations";

export type WeaningMethod = "traditional" | "fence_line" | "nose_tab" | "early" | "other";

export type CowCalfSaleType = "calf" | "cull_cow" | "bull" | "replacement" | "pair" | "group" | "other";

export type LossCause = "unknown" | "disease" | "predator" | "accident" | "calving" | "old_age" | "other";

export interface WeaningRecord {
  id: string;
  weaned_at: string;
  calf_id: string | null;
  calf_tag: string | null;
  dam_id: string | null;
  dam_tag: string | null;
  weaning_weight_lbs: number | null;
  weaning_method: WeaningMethod | null;
  cow_calf_herd_id: string | null;
  herd_name: string | null;
  destination_herd_id: string | null;
  destination_herd_name: string | null;
  retained_as_heifer: boolean;
  notes: string | null;
}

export interface CowCalfSaleRecord {
  id: string;
  sale_date: string;
  buyer_name: string | null;
  head_count: number;
  total_amount: number | null;
  fees: number | null;
  net_amount: number | null;
  cow_calf_sale_type: CowCalfSaleType | null;
  cow_calf_herd_id: string | null;
  herd_name: string | null;
  animal_ids: string[] | null;
  notes: string | null;
}

export interface LossRecord {
  id: string;
  loss_date: string;
  individual_animal_id: string;
  animal_tag: string | null;
  animal_name: string | null;
  cause: LossCause;
  herd_name: string | null;
  location_name: string | null;
  disposal_method: string | null;
  notes: string | null;
}

export interface WeaningSummary {
  total: number;
  thisMonth: number;
  calvesReadyToWean: number;
}

export interface CowCalfSalesSummary {
  totalSales: number;
  headSoldLast30Days: number;
  revenueLast30Days: number;
}

export function calfStatusAfterWeaning(retainedAsReplacement: boolean): CalfLifecycleStatus {
  return retainedAsReplacement ? "replacement" : "weaned";
}

export function animalTypeAfterReplacementWeaning(sex: string | null): "heifer" | "other" {
  return sex === "female" || sex === "heifer_calf" ? "heifer" : "other";
}

export function reproductiveStatusAfterSale(animalType: string): ReproductiveStatus {
  if (animalType === "bull") return "sold";
  return "sold";
}
