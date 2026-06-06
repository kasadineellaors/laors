"use client";

import Link from "next/link";
import type { TaskRecord } from "@/lib/tasks/types";
import { cn } from "@/lib/utils/cn";

const STATUS_LABELS: Record<TaskRecord["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_CLASS: Record<TaskRecord["priority"], string> = {
  low: "bg-charcoal/10 text-charcoal/70",
  normal: "bg-olive/10 text-olive",
  high: "bg-rust/15 text-rust",
};

interface TaskListProps {
  tasks: TaskRecord[];
  emptyMessage?: string;
}

export function TaskList({ tasks, emptyMessage = "No tasks yet." }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-charcoal/60">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/jobs/${task.id}`}
            className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-olive/40 hover:bg-olive/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-charcoal">{task.title}</p>
                {task.category_name ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-charcoal/50">
                    {task.category_name}
                  </p>
                ) : null}
                {task.location_label ? (
                  <p className="mt-1 text-sm text-charcoal/60">{task.location_label}</p>
                ) : null}
                {task.due_date ? (
                  <p className="mt-1 text-xs text-charcoal/50">
                    Due {new Date(task.due_date + "T12:00:00").toLocaleDateString()}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    PRIORITY_CLASS[task.priority],
                  )}
                >
                  {task.priority}
                </span>
                <span className="text-xs text-charcoal/50">{STATUS_LABELS[task.status]}</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
