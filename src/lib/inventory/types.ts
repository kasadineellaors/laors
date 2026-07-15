export interface GroupInventoryLine {
  classification_id: string;
  classification_name: string;
  short_code: string | null;
  head_count: number;
}

export interface CattleGroupSummary {
  id: string;
  name: string;
  location_id: string | null;
  location_name: string | null;
  location_breadcrumb: string | null;
  total_head: number;
  counts: GroupInventoryLine[];
  notes: string | null;
  ownership_group_id: string | null;
  ownership_group_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  lot_number: string | null;
  enterprise_type: string;
  lot_status: string;
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

export interface MoveLineInput {
  classification_id: string;
  head_count: number;
}

export interface MovementLineDetail {
  classification_id: string;
  classification_name: string;
  head_count: number;
}

export interface MovementRecord {
  id: string;
  moved_at: string;
  status: "completed" | "voided";
  total_head: number;
  is_partial: boolean;
  notes: string | null;
  source_group_name: string;
  destination_group_name: string;
  source_location_name: string | null;
  destination_location_name: string | null;
  reason_name: string | null;
  movement_reason_id: string | null;
  lines: MovementLineDetail[];
}

export interface CountLineInput {
  classification_id: string;
  head_count: number;
}
