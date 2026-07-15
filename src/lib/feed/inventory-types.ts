export type FeedAdjustmentType = "receive" | "use" | "adjust" | "feeding";

export interface FeedItemRecord {
  id: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  reorder_at: number | null;
  price_per_unit: number | null;
  notes: string | null;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedItemOption {
  id: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  price_per_unit: number | null;
}

export interface FeedStockAdjustment {
  id: string;
  feed_item_id: string;
  previous_quantity: number;
  new_quantity: number;
  delta: number;
  adjustment_type: FeedAdjustmentType;
  feeding_record_id: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface FeedRationIngredient {
  id: string;
  feed_ration_id: string;
  feed_item_id: string;
  feed_item_name: string;
  feed_item_unit: string;
  quantity_per_ration_unit: number;
}

export interface FeedRationIngredientInput {
  feedItemId: string;
  quantityPerRationUnit: number;
}
