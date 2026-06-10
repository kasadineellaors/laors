export interface WeaningRecord {
  id: string;
  calving_record_id: string | null;
  dam_id: string | null;
  dam_tag: string | null;
  dam_name: string | null;
  calf_id: string | null;
  calf_tag: string | null;
  weaned_at: string;
  weaning_weight_lbs: number | null;
  retained_as_heifer: boolean;
  notes: string | null;
}
