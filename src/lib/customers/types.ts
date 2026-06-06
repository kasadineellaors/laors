export interface CustomerRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  yardage_rate_per_head_day: number | null;
  medicine_markup_percent: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  yardage_rate_per_head_day: number | null;
  medicine_markup_percent: number | null;
}
