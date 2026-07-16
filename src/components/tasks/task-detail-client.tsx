"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption, TaskRecord } from "@/lib/tasks/types";
import { archiveTask, completeTask, updateTask } from "@/lib/actions/tasks";
import {
  formatDueLabel,
  formatShortDate,
  isOpenTask,
  isOverdue,
  priorityLabel,
  todayIso,
} from "@/lib/tasks/display";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface TaskDetailClientProps {
  orgId: string;
  currentUserId?: string;
  task: TaskRecord;
  categoryOptions: SelectOption[];
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
}

export function TaskDetailClient({
  orgId,
  currentUserId,
  task,
  categoryOptions,
  locationOptions,
  groupOptions,
  memberOptions,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const today = todayIso();
  const open = isOpenTask(task.status);
  const dueLabel = formatDueLabel(task, today);
  const overdue = isOverdue(task, today);

  async function markDone() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await completeTask(orgId, task.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function setStatus(status: "open" | "in_progress") {
    setLoading(true);
    const result = await updateTask(orgId, task.id, { status });
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleArchive() {
    if (!window.confirm("Archive this task? It will be removed from active lists.")) return;
    setLoading(true);
    const result = await archiveTask(orgId, task.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/jobs");
  }

  if (editing) {
    return (
      <div className="space-y-4 pb-4">
        <Link href="/jobs" className="text-sm font-medium text-brown hover:underline">
          ← Jobs
        </Link>
        <TaskForm
          orgId={orgId}
          currentUserId={currentUserId}
          task={task}
          categoryOptions={categoryOptions}
          locationOptions={locationOptions}
          groupOptions={groupOptions}
          memberOptions={memberOptions}
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
        />
        <Button variant="ghost" fullWidth onClick={() => setEditing(false)}>
          Cancel edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <Link href="/jobs" className="text-sm font-medium text-brown hover:underline">
        ← Jobs
      </Link>

      <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-navy">{task.title}</h1>
          {overdue ? (
            <span className="inline-flex rounded-full bg-status-critical-bg px-2.5 py-0.5 text-xs font-semibold text-status-critical">
              Overdue
            </span>
          ) : null}
          {task.status === "done" ? (
            <span className="inline-flex rounded-full bg-status-success/15 px-2.5 py-0.5 text-xs font-semibold text-status-success">
              Completed
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm capitalize text-text-secondary">
          {task.status.replace("_", " ")} · {priorityLabel(task.priority)}
        </p>

        {task.description ? (
          <p className="mt-4 text-text-primary whitespace-pre-wrap">{task.description}</p>
        ) : null}

        <dl className="mt-6 space-y-4 text-sm">
          {task.category_name ? (
            <div>
              <dt className="text-text-secondary">Category</dt>
              <dd className="font-medium text-text-primary">{task.category_name}</dd>
            </div>
          ) : null}
          {task.location_label ? (
            <div>
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium text-text-primary">{task.location_label}</dd>
            </div>
          ) : null}
          {task.cattle_group_name ? (
            <div>
              <dt className="text-text-secondary">Cattle group</dt>
              <dd className="font-medium text-text-primary">{task.cattle_group_name}</dd>
            </div>
          ) : null}
          {task.assigned_to_name ? (
            <div>
              <dt className="text-text-secondary">Assigned to</dt>
              <dd className="font-medium text-text-primary">{task.assigned_to_name}</dd>
            </div>
          ) : open ? (
            <div>
              <dt className="text-text-secondary">Assigned to</dt>
              <dd className="font-medium text-text-secondary">Unassigned</dd>
            </div>
          ) : null}
          {dueLabel ? (
            <div>
              <dt className="text-text-secondary">Due</dt>
              <dd
                className={cn(
                  "font-medium",
                  overdue ? "text-status-critical" : "text-text-primary",
                )}
              >
                {dueLabel}
              </dd>
            </div>
          ) : null}
          {task.completed_at ? (
            <div>
              <dt className="text-text-secondary">Completed</dt>
              <dd className="font-medium text-text-primary">
                {formatShortDate(task.completed_at.slice(0, 10))}
              </dd>
            </div>
          ) : null}
          {task.notes ? (
            <div>
              <dt className="text-text-secondary">Internal notes</dt>
              <dd className="font-medium text-text-primary whitespace-pre-wrap">{task.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {open ? (
          <>
            <Button size="lg" fullWidth onClick={markDone} disabled={loading}>
              Mark Complete
            </Button>
            {task.status === "open" ? (
              <Button
                variant="outline"
                fullWidth
                onClick={() => setStatus("in_progress")}
                disabled={loading}
              >
                Start working
              </Button>
            ) : (
              <Button
                variant="outline"
                fullWidth
                onClick={() => setStatus("open")}
                disabled={loading}
              >
                Mark open
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              startTransition(async () => {
                setLoading(true);
                const result = await updateTask(orgId, task.id, { status: "open" });
                setLoading(false);
                if (result.error) setError(result.error);
                else router.refresh();
              });
            }}
            disabled={loading}
          >
            Reopen task
          </Button>
        )}
        <Button variant="secondary" fullWidth onClick={() => setEditing(true)}>
          Edit task
        </Button>
        <Button
          variant="ghost"
          fullWidth
          className="text-status-critical"
          onClick={handleArchive}
          disabled={loading}
        >
          Archive
        </Button>
      </div>
    </div>
  );
}
