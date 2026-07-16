import type { SeedstockSaleType } from "@/lib/seedstock/constants";

export interface SaleRecord {
  id: string;
  sale_date: string;
  buyer_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  individual_animal_id: string | null;
  individual_animal_tag: string | null;
  seedstock_sale_type: SeedstockSaleType | null;
  head_count: number;
  total_amount: number | null;
  price_per_head: number | null;
  avg_weight_lbs: number | null;
  inventory_deducted: boolean;
  notes: string | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  location_id: string | null;
  location_label: string | null;
  financial_category_id: string | null;
  financial_category_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesSummary {
  totalHeadSoldLast30Days: number;
  totalRevenueLast30Days: number;
  recordCount: number;
}
