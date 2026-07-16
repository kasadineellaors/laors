import type { TaskPriority, TaskRecord, TaskStatus } from "./types";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOpenTask(status: TaskStatus): boolean {
  return status === "open" || status === "in_progress";
}

export function isOverdue(task: TaskRecord, today = todayIso()): boolean {
  if (!isOpenTask(task.status) || !task.due_date) return false;
  return task.due_date < today;
}

export function isDueToday(task: TaskRecord, today = todayIso()): boolean {
  if (!isOpenTask(task.status) || !task.due_date) return false;
  return task.due_date === today;
}

export function isUpcoming(task: TaskRecord, today = todayIso()): boolean {
  if (!isOpenTask(task.status) || !task.due_date) return false;
  return task.due_date > today;
}

export function priorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: "Low priority",
    normal: "Normal priority",
    high: "High priority",
  };
  return labels[priority] ?? priority;
}

export function priorityVariant(
  priority: TaskPriority,
): "neutral" | "warning" | "critical" {
  if (priority === "high") return "warning";
  return "neutral";
}

export function formatDueLabel(task: TaskRecord, today = todayIso()): string | null {
  if (!task.due_date) return null;
  if (task.status === "done") {
    return `Completed ${formatShortDate(task.due_date)}`;
  }
  if (isOverdue(task, today)) return `Overdue · ${formatShortDate(task.due_date)}`;
  if (isDueToday(task, today)) return "Due today";
  return `Due ${formatShortDate(task.due_date)}`;
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function urgencyRank(task: TaskRecord, today = todayIso()): number {
  if (!isOpenTask(task.status)) return 100;
  if (isOverdue(task, today)) return 0;
  if (task.priority === "high") return 1;
  if (isDueToday(task, today)) return 2;
  if (isUpcoming(task, today)) return 3;
  return 4;
}

export function sortTasksByUrgency(tasks: TaskRecord[], today = todayIso()): TaskRecord[] {
  return [...tasks].sort((a, b) => {
    const rankDiff = urgencyRank(a, today) - urgencyRank(b, today);
    if (rankDiff !== 0) return rankDiff;
    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    const priorityOrder: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.created_at.localeCompare(a.created_at);
  });
}

export type TaskSection = "overdue" | "due_today" | "upcoming" | "no_due_date";

export function sectionForTask(task: TaskRecord, today = todayIso()): TaskSection | null {
  if (!isOpenTask(task.status)) return null;
  if (isOverdue(task, today)) return "overdue";
  if (isDueToday(task, today)) return "due_today";
  if (task.due_date) return "upcoming";
  return "no_due_date";
}

export const SECTION_LABELS: Record<TaskSection, string> = {
  overdue: "Overdue",
  due_today: "Due Today",
  upcoming: "Upcoming",
  no_due_date: "No Due Date",
};

export function groupOpenTasks(
  tasks: TaskRecord[],
  today = todayIso(),
): Array<{ section: TaskSection; tasks: TaskRecord[] }> {
  const sorted = sortTasksByUrgency(tasks, today);
  const groups: TaskSection[] = ["overdue", "due_today", "upcoming", "no_due_date"];
  return groups
    .map((section) => ({
      section,
      tasks: sorted.filter((t) => sectionForTask(t, today) === section),
    }))
    .filter((g) => g.tasks.length > 0);
}

export function addDaysIso(days: number, from = todayIso()): string {
  const d = new Date(`${from}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function endOfWeekIso(from = todayIso()): string {
  const d = new Date(`${from}T12:00:00`);
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toISOString().slice(0, 10);
}
