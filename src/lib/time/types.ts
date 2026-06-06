export interface TimeEntryRecord {
  id: string;
  user_id: string;
  user_name: string;
  clock_in_at: string;
  clock_out_at: string | null;
  notes: string | null;
  duration_minutes: number | null;
}

export interface ClockStatus {
  isClockedIn: boolean;
  openEntry: TimeEntryRecord | null;
}
