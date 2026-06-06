"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption, TaskPriority, TaskRecord } from "@/lib/tasks/types";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskFormProps {
  orgId: string;
  categoryOptions: SelectOption[];
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  task?: TaskRecord;
  onSuccess?: () => void;
}

export function TaskForm({
  orgId,
  categoryOptions,
  locationOptions,
  groupOptions,
  memberOptions,
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      description: description || undefined,
      categoryId: categoryId || undefined,
      locationId: locationId || undefined,
      cattleGroupId: groupId || undefined,
      priority,
      dueDate: dueDate || undefined,
      assignedTo: assignedTo || undefined,
      notes: notes || undefined,
    };

    const result = isEdit
      ? await updateTask(orgId, task!.id, {
          ...payload,
          description: description || null,
          categoryId: categoryId || null,
          locationId: locationId || null,
          cattleGroupId: groupId || null,
          dueDate: dueDate || null,
          assignedTo: assignedTo || null,
          notes: notes || null,
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
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit task" : "New task"}</CardTitle>
        <CardDescription>What needs doing on the ranch?</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Fix water trough"
          />
        </div>
        <div>
          <Label htmlFor="description">Details (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="South trap — float valve stuck"
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
        ) : null}
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
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
              {memberOptions.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create task"}
        </Button>
      </form>
    </Card>
  );
}
