export interface ExposureRecord {
  id: string;
  breeding_context: "cow_calf" | "seedstock";
  cow_calf_herd_id: string | null;
  herd_name: string | null;
  exposed_cow_count: number | null;
  dam_id: string | null;
  dam_tag: string | null;
  dam_name: string | null;
  bull_id: string | null;
  sire_tag: string | null;
  bull_tag: string | null;
  bull_name: string | null;
  exposure_start: string;
  exposure_end: string | null;
  location_id: string | null;
  location_name: string | null;
  notes: string | null;
  is_active?: boolean;
  duration_days?: number;
}
