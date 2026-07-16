"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption, TaskPriority, TaskRecord } from "@/lib/tasks/types";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { addDaysIso, endOfWeekIso, todayIso } from "@/lib/tasks/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface TaskFormProps {
  orgId: string;
  categoryOptions: SelectOption[];
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  currentUserId?: string;
  task?: TaskRecord;
  onSuccess?: () => void;
}

function metaString(meta: Record<string, string | number | null> | undefined, key: string) {
  const value = meta?.[key];
  return value != null && value !== "" ? String(value) : "";
}

function metaNumber(meta: Record<string, string | number | null> | undefined, key: string) {
  const value = meta?.[key];
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function TaskForm({
  orgId,
  categoryOptions,
  locationOptions,
  groupOptions,
  memberOptions,
  currentUserId,
  task,
  onSuccess,
}: TaskFormProps) {
  const router = useRouter();
  const isEdit = Boolean(task);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [categoryId, setCategoryId] = useState(task?.category_id ?? "");
  const [locationId, setLocationId] = useState(task?.location_id ?? "");
  const [groupId, setGroupId] = useState(task?.cattle_group_id ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedGroup = groupOptions.find((g) => g.value === groupId);
  const groupMeta = selectedGroup?.meta;
  const groupLocationId = metaString(groupMeta, "location_id");
  const groupLocationName =
    metaString(groupMeta, "location_breadcrumb") || metaString(groupMeta, "location_name");
  const groupDisplayName = metaString(groupMeta, "name");
  const groupHeadCount = metaNumber(groupMeta, "total_head");

  useEffect(() => {
    if (!groupId || !selectedGroup) return;
    if (groupLocationId && !locationId) setLocationId(groupLocationId);
  }, [groupId, selectedGroup, groupLocationId, locationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFieldErrors({ title: "Enter a task title" });
      setLoading(false);
      return;
    }

    if (dueDate && Number.isNaN(Date.parse(`${dueDate}T12:00:00`))) {
      setFieldErrors({ dueDate: "Enter a valid due date" });
      setLoading(false);
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim() || undefined,
      categoryId: categoryId || undefined,
      locationId: locationId || undefined,
      cattleGroupId: groupId || undefined,
      priority,
      dueDate: dueDate || undefined,
      assignedTo: assignedTo || undefined,
      notes: notes.trim() || undefined,
    };

    const result = isEdit
      ? await updateTask(orgId, task!.id, {
          ...payload,
          description: description.trim() || null,
          categoryId: categoryId || null,
          locationId: locationId || null,
          cattleGroupId: groupId || null,
          dueDate: dueDate || null,
          assignedTo: assignedTo || null,
          notes: notes.trim() || null,
        })
      : await createTask(orgId, payload);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.taskId) router.push(`/jobs/${result.taskId}`);
    else router.push("/jobs");
    router.refresh();
  }

  const selectClass =
    "flex h-12 min-h-12 w-full rounded-lg border border-border-neutral bg-surface-white px-4 text-base text-text-primary";

  const dateShortcuts = [
    { label: "Today", value: todayIso() },
    { label: "Tomorrow", value: addDaysIso(1) },
    { label: "This Week", value: endOfWeekIso() },
    { label: "No Due Date", value: "" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-navy">{isEdit ? "Edit task" : "New task"}</CardTitle>
        <CardDescription>What needs to be done?</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title">Task title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Fix water trough"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "title-error" : undefined}
          />
          {fieldErrors.title ? (
            <p id="title-error" className="mt-1 text-sm text-status-critical" role="alert">
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="description">Instructions or details (optional)</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="South trap — float valve stuck"
            rows={3}
            className="flex min-h-[5rem] w-full rounded-lg border border-border-neutral bg-surface-white px-4 py-3 text-base"
          />
        </div>

        {categoryOptions.length > 0 ? (
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select category</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {locationOptions.length > 0 ? (
          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={selectClass}
            >
              <option value="">Ranch-wide</option>
              {locationOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {groupOptions.length > 0 ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="group">Cattle group (optional)</Label>
              <select
                id="group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className={selectClass}
              >
                <option value="">None</option>
                {groupOptions.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {groupId ? (
              <div className="rounded-lg border border-border-neutral bg-tan/20 px-4 py-3 text-sm">
                {groupDisplayName ? (
                  <p className="font-medium text-text-primary">{groupDisplayName}</p>
                ) : null}
                {groupLocationName ? (
                  <p className="mt-0.5 text-text-secondary">{groupLocationName}</p>
                ) : null}
                {groupHeadCount != null ? (
                  <p className="mt-0.5 text-text-secondary">{groupHeadCount} head</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className={selectClass}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="dueDate">Due date (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {dateShortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => setDueDate(shortcut.value)}
                className={cn(
                  "min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  dueDate === shortcut.value
                    ? "bg-navy text-white"
                    : "border border-border-neutral bg-surface-white text-navy hover:border-navy/40",
                )}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-invalid={Boolean(fieldErrors.dueDate)}
            aria-describedby={fieldErrors.dueDate ? "dueDate-error" : undefined}
          />
          {fieldErrors.dueDate ? (
            <p id="dueDate-error" className="text-sm text-status-critical" role="alert">
              {fieldErrors.dueDate}
            </p>
          ) : null}
        </div>

        {memberOptions.length > 0 ? (
          <div>
            <Label htmlFor="assigned">Assign to</Label>
            <select
              id="assigned"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={selectClass}
            >
              <option value="">Unassigned</option>
              {currentUserId ? (
                <option value={currentUserId}>
                  Me
                  {memberOptions.find((m) => m.user_id === currentUserId)?.name
                    ? ` (${memberOptions.find((m) => m.user_id === currentUserId)!.name})`
                    : ""}
                </option>
              ) : null}
              {memberOptions
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
        ) : null}

        <div>
          <Label htmlFor="notes">Internal notes (optional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Team-only context, not shown to customers"
          />
        </div>

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pb-4">
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
