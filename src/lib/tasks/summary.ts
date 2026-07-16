import type { TaskRecord } from "./types";
import { isDueToday, isOpenTask, isOverdue, todayIso } from "./display";

export interface JobsSummary {
  overdue: number;
  dueToday: number;
  open: number;
  unassigned: number;
}

export function computeJobsSummary(tasks: TaskRecord[], today = todayIso()): JobsSummary {
  const openTasks = tasks.filter((t) => isOpenTask(t.status));
  return {
    overdue: openTasks.filter((t) => isOverdue(t, today)).length,
    dueToday: openTasks.filter((t) => isDueToday(t, today)).length,
    open: openTasks.length,
    unassigned: openTasks.filter((t) => !t.assigned_to).length,
  };
}
