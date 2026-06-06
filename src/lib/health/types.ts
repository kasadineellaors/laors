export interface TreatmentRecord {
  id: string;
  product_name: string;
  treatment_type: string | null;
  head_count: number | null;
  treatment_date: string;
  notes: string | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  location_id: string | null;
  location_label: string | null;
  administered_by: string | null;
  administered_by_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  medicine_item_id: string | null;
  medicine_item_name: string | null;
  quantity_used: number | null;
  created_at: string;
  updated_at: string;
}
