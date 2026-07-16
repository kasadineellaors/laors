export interface FeedRationRecord {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number | null;
  effective_from: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedRationOption {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number | null;
}

export type FeedingContext = "general" | "cow_calf";

export interface FeedingSummary {
  thisMonth: number;
  last7Days: number;
  totalQuantityThisMonth: number;
  feedingsToday: number;
  amountFedThisWeek: number;
  feedCostThisWeek: number;
}

export interface FeedingFormPrefill {
  groupId?: string;
  locationId?: string;
  ownerId?: string;
  feedRationId?: string;
  quantity?: string;
}

export interface FeedingRecord {
  id: string;
  fed_at: string;
  feeding_context: FeedingContext;
  feed_ration_id: string;
  feed_ration_name: string;
  feed_ration_unit: string;
  quantity: number;
  head_count: number | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  location_id: string | null;
  location_label: string | null;
  ownership_group_id: string | null;
  ownership_group_name: string | null;
  fed_by: string | null;
  fed_by_name: string | null;
  notes: string | null;
  unit_cost_snapshot: number | null;
  total_feed_cost: number | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}
