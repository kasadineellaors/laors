export type MedicineAdjustmentType = "receive" | "use" | "adjust" | "treatment";

export interface MedicineItemRecord {
  id: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  price_per_cc: number | null;
  avg_unit_cost: number | null;
  withdrawal_days: number | null;
  reorder_at: number | null;
  notes: string | null;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineStockAdjustment {
  id: string;
  medicine_item_id: string;
  previous_quantity: number;
  new_quantity: number;
  delta: number;
  adjustment_type: MedicineAdjustmentType;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface MedicineOption {
  id: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  price_per_cc: number | null;
  withdrawal_days: number | null;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}
