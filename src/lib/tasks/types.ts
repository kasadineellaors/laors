export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "normal" | "high";

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  notes: string | null;
  category_id: string | null;
  category_name: string | null;
  location_id: string | null;
  location_label: string | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMemberOption {
  user_id: string;
  name: string;
}
