export type EnterpriseType =
  | "stocker"
  | "cow_calf"
  | "breeding"
  | "raised_calves"
  | "custom_fed";

export type LotStatus =
  | "receiving"
  | "active"
  | "hospital"
  | "ready_to_sell"
  | "partially_sold"
  | "closed";

export type ProcessingType =
  | "arrival"
  | "revaccination"
  | "branding"
  | "implanting"
  | "pregnancy_check"
  | "weaning"
  | "bull_work"
  | "other";

export const ENTERPRISE_LABELS: Record<EnterpriseType, string> = {
  stocker: "Stocker",
  cow_calf: "Cow-calf",
  breeding: "Breeding cattle",
  raised_calves: "Raised calves",
  custom_fed: "Custom-fed cattle",
};

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  receiving: "Receiving",
  active: "Active",
  hospital: "Hospital",
  ready_to_sell: "Ready to sell",
  partially_sold: "Partially sold",
  closed: "Closed",
};

export const PROCESSING_TYPE_LABELS: Record<ProcessingType, string> = {
  arrival: "Arrival processing",
  revaccination: "Revaccination",
  branding: "Branding",
  implanting: "Implanting",
  pregnancy_check: "Pregnancy check",
  weaning: "Weaning",
  bull_work: "Bull work",
  other: "Other",
};

export interface LotFields {
  lot_number: string | null;
  enterprise_type: EnterpriseType;
  lot_status: LotStatus;
  opened_at: string | null;
  closed_at: string | null;
  purchase_date: string | null;
  arrival_date: string | null;
  starting_head: number | null;
  pay_weight_lbs: number | null;
  avg_weight_lbs: number | null;
  purchase_price_per_lb: number | null;
  landed_cost: number | null;
  seller_name: string | null;
  source_name: string | null;
}

export interface LotOperationalSummary {
  days_on_feed: number;
  feed_events: number;
  estimated_feed_cost: number;
  treatment_events: number;
  estimated_medicine_cost: number;
  processing_cost: number;
  heads_sold: number;
  sale_revenue: number;
  deaths: number;
  death_value_lost: number;
  total_invested: number;
  estimated_cost_per_head: number;
}

export interface ProcessingEventRecord {
  id: string;
  processed_at: string;
  head_count: number;
  processing_type: ProcessingType;
  chute_charge: number;
  labor_charge: number;
  processing_fee: number;
  medicine_cost: number;
  total_cost: number;
  notes: string | null;
}

export interface MortalityRecord {
  id: string;
  died_at: string;
  head_count: number;
  cause: string | null;
  disposal_method: string | null;
  value_lost: number | null;
  notes: string | null;
}
