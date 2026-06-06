"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption, TaskRecord } from "@/lib/tasks/types";
import { archiveTask, completeTask, updateTask } from "@/lib/actions/tasks";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface TaskDetailClientProps {
  orgId: string;
  task: TaskRecord;
  categoryOptions: SelectOption[];
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
}

export function TaskDetailClient({
  orgId,
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

  const isOpen = task.status === "open" || task.status === "in_progress";

  async function markDone() {
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
    if (!window.confirm("Archive this task?")) return;
    setLoading(true);
    const result = await archiveTask(orgId, task.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/jobs");
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href="/jobs" className="text-sm font-medium text-olive hover:underline">
          ← Jobs
        </Link>
        <TaskForm
          orgId={orgId}
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
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-sm font-medium text-olive hover:underline">
          ← Jobs
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">{task.title}</h1>
        <p className="text-sm capitalize text-charcoal/60">
          {task.status.replace("_", " ")} · {task.priority} priority
        </p>
      </div>

      {task.description ? (
        <p className="text-charcoal/80">{task.description}</p>
      ) : null}

      <dl className="space-y-2 text-sm">
        {task.category_name ? (
          <div>
            <dt className="text-charcoal/50">Category</dt>
            <dd className="font-medium">{task.category_name}</dd>
          </div>
        ) : null}
        {task.location_label ? (
          <div>
            <dt className="text-charcoal/50">Location</dt>
            <dd className="font-medium">{task.location_label}</dd>
          </div>
        ) : null}
        {task.cattle_group_name ? (
          <div>
            <dt className="text-charcoal/50">Cattle group</dt>
            <dd className="font-medium">{task.cattle_group_name}</dd>
          </div>
        ) : null}
        {task.assigned_to_name ? (
          <div>
            <dt className="text-charcoal/50">Assigned to</dt>
            <dd className="font-medium">{task.assigned_to_name}</dd>
          </div>
        ) : null}
        {task.due_date ? (
          <div>
            <dt className="text-charcoal/50">Due</dt>
            <dd className="font-medium">
              {new Date(task.due_date + "T12:00:00").toLocaleDateString()}
            </dd>
          </div>
        ) : null}
        {task.notes ? (
          <div>
            <dt className="text-charcoal/50">Notes</dt>
            <dd className="font-medium">{task.notes}</dd>
          </div>
        ) : null}
      </dl>

      {error ? <p className="text-sm text-rust">{error}</p> : null}

      <div className="grid gap-3">
        {isOpen ? (
          <>
            <Button size="lg" fullWidth onClick={markDone} disabled={loading}>
              Mark done
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
            onClick={() => setStatus("open")}
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
          className={cn("text-rust")}
          onClick={handleArchive}
          disabled={loading}
        >
          Archive
        </Button>
      </div>
    </div>
  );
}
