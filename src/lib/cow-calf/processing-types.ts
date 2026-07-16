export type ProcessingEventType =
  | "birth_processing"
  | "branding"
  | "vaccination"
  | "castration"
  | "deworming"
  | "other";

export interface ProcessingEvent {
  id: string;
  event_type: ProcessingEventType;
  processed_at: string;
  cow_calf_herd_id: string | null;
  herd_name: string | null;
  location_id: string | null;
  location_name: string | null;
  product_name: string | null;
  head_count: number | null;
  notes: string | null;
  calf_count: number;
}

export interface ProcessingSummary {
  totalEvents: number;
  unprocessedCalves: number;
  thisMonth: number;
}
