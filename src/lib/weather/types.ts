export interface RainfallRecord {
  id: string;
  recorded_date: string;
  amount_inches: number;
  notes: string | null;
  location_id: string | null;
  location_label: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RainfallSummary {
  totalLast30Days: number;
  recordCount: number;
}
