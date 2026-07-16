export type CalendarEventType =
  | "general"
  | "feeding"
  | "health"
  | "breeding"
  | "calving"
  | "move"
  | "sale"
  | "other";

export type CalendarItemSource = "event" | "task" | "breeding";

export interface CalendarEventRecord {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  event_type: CalendarEventType;
  location_id: string | null;
  location_label: string | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  color: string | null;
  created_by: string | null;
  created_by_name: string | null;
  assigned_to_name: string | null;
  priority: string | null;
  editable: boolean;
  source: CalendarItemSource;
}

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  general: "General",
  feeding: "Feeding",
  health: "Health",
  breeding: "Breeding",
  calving: "Calving",
  move: "Move",
  sale: "Sale",
  other: "Other",
};
