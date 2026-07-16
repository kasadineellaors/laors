"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TaskPriority, TaskRecord } from "@/lib/tasks/types";
import { completeTask } from "@/lib/actions/tasks";
import {
  SECTION_LABELS,
  formatDueLabel,
  groupOpenTasks,
  isDueToday,
  isOpenTask,
  isOverdue,
  priorityLabel,
  priorityVariant,
  sortTasksByUrgency,
  todayIso,
} from "@/lib/tasks/display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type StatusFilter = "open" | "due_today" | "overdue" | "completed" | "all";

interface TaskListProps {
  orgId: string;
  tasks: TaskRecord[];
  currentUserId?: string;
}

function filterPillClass(active: boolean) {
  return cn(
    "min-h-11 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
    active
      ? "bg-navy text-white"
      : "border border-border-neutral bg-surface-white text-navy hover:border-navy/40",
  );
}

function PriorityChip({ priority }: { priority: TaskPriority }) {
  const variant = priorityVariant(priority);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "warning" && "bg-status-warning-bg text-status-warning",
        variant === "neutral" && "bg-tan/50 text-text-secondary",
      )}
    >
      {priorityLabel(priority)}
    </span>
  );
}

function TaskCard({
  task,
  onComplete,
  completing,
}: {
  task: TaskRecord;
  onComplete: (id: string) => void;
  completing: boolean;
}) {
  const today = todayIso();
  const dueLabel = formatDueLabel(task, today);
  const overdue = isOverdue(task, today);
  const dueToday = isDueToday(task, today);
  const open = isOpenTask(task.status);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "group relative rounded-[var(--radius-card)] border border-border-neutral bg-surface-white shadow-[var(--shadow-card)] transition-all",
        "hover:border-navy/25 hover:shadow-[0_4px_12px_rgba(39,66,93,0.12)]",
      )}
    >
      <div className="flex items-stretch gap-2 p-4">
        {open ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onComplete(task.id);
            }}
            disabled={completing}
            aria-label={`Mark ${task.title} complete`}
            className={cn(
              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-neutral",
              "hover:border-status-success hover:bg-status-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
              completing && "opacity-50",
            )}
          >
            <span
              className="h-5 w-5 rounded border-2 border-text-secondary group-hover:border-status-success"
              aria-hidden
            />
          </button>
        ) : (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
            <span className="flex h-5 w-5 items-center justify-center rounded border-2 border-status-success bg-status-success/20 text-xs text-status-success">
              ✓
            </span>
          </div>
        )}

        <Link
          href={`/jobs/${task.id}`}
          className={cn(
            "min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
            "cursor-pointer",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold text-navy">{task.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {task.priority !== "normal" ? <PriorityChip priority={task.priority} /> : null}
                {overdue ? (
                  <span className="inline-flex rounded-full bg-status-critical-bg px-2.5 py-0.5 text-xs font-semibold text-status-critical">
                    Overdue
                  </span>
                ) : dueToday ? (
                  <span className="inline-flex rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning">
                    Due today
                  </span>
                ) : null}
                {task.status === "in_progress" ? (
                  <span className="inline-flex rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-semibold text-status-info">
                    In progress
                  </span>
                ) : null}
                {task.status === "done" ? (
                  <span className="inline-flex rounded-full bg-status-success/15 px-2.5 py-0.5 text-xs font-semibold text-status-success">
                    Completed
                  </span>
                ) : null}
              </div>
            </div>
            <span
              className="shrink-0 text-lg text-text-secondary transition-transform group-hover:translate-x-0.5"
              aria-hidden
            >
              ›
            </span>
          </div>

          {task.location_label ? (
            <p className="mt-2 text-sm font-medium text-text-primary">{task.location_label}</p>
          ) : null}

          {task.cattle_group_name ? (
            <p className="mt-0.5 text-sm text-text-secondary">{task.cattle_group_name}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
            {task.assigned_to_name ? (
              <span>Assigned to {task.assigned_to_name}</span>
            ) : open ? (
              <span>Unassigned</span>
            ) : null}
            {dueLabel ? (
              <span
                className={cn(
                  overdue && "font-medium text-status-critical",
                  dueToday && "font-medium text-status-warning",
                )}
              >
                {dueLabel}
              </span>
            ) : null}
            {task.category_name ? <span>{task.category_name}</span> : null}
          </div>
        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label={`Actions for ${task.title}`}
            aria-expanded={menuOpen}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg border border-border-neutral text-navy",
              "hover:bg-tan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
            )}
          >
            ⋯
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-border-neutral bg-surface-white py-1 shadow-lg">
                <Link
                  href={`/jobs/${task.id}`}
                  className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-tan/30"
                  onClick={() => setMenuOpen(false)}
                >
                  Edit
                </Link>
                {open ? (
                  <button
                    type="button"
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-navy hover:bg-tan/30"
                    onClick={() => {
                      setMenuOpen(false);
                      onComplete(task.id);
                    }}
                    disabled={completing}
                  >
                    Mark Complete
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: StatusFilter }) {
  const isOpenFilter = filter === "open" || filter === "due_today" || filter === "overdue";

  if (!isOpenFilter) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-border-neutral px-6 py-10 text-center text-sm text-text-secondary">
        No tasks match this filter.
      </p>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-6 py-12 text-center shadow-[var(--shadow-card)]">
      <p className="text-lg font-semibold text-navy">No open tasks.</p>
      <p className="mt-2 text-sm text-text-secondary">
        Everything is caught up, or create a task for work that still needs doing.
      </p>
      <Link href="/jobs/new" className="mt-6 inline-block">
        <Button size="md">+ Create Task</Button>
      </Link>
    </div>
  );
}

export function TaskList({ orgId, tasks, currentUserId }: TaskListProps) {
  const router = useRouter();
  const today = todayIso();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const categoryOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.category_name).filter(Boolean))].sort() as string[],
    [tasks],
  );
  const locationOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.location_label).filter(Boolean))].sort() as string[],
    [tasks],
  );
  const groupOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.cattle_group_name).filter(Boolean))].sort() as string[],
    [tasks],
  );
  const assigneeOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean))].sort() as string[],
    [tasks],
  );

  const hasAdvanced =
    categoryOptions.length > 1 ||
    locationOptions.length > 1 ||
    groupOptions.length > 1 ||
    assigneeOptions.length > 1 ||
    Boolean(currentUserId);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter === "open" && !isOpenTask(task.status)) return false;
      if (statusFilter === "completed" && task.status !== "done") return false;
      if (statusFilter === "overdue" && !isOverdue(task, today)) return false;
      if (statusFilter === "due_today" && !isDueToday(task, today)) return false;
      if (assignedToMe && currentUserId && task.assigned_to !== currentUserId) return false;
      if (unassignedOnly && task.assigned_to) return false;
      if (assigneeFilter !== "all" && task.assigned_to_name !== assigneeFilter) return false;
      if (categoryFilter !== "all" && task.category_name !== categoryFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (locationFilter !== "all" && task.location_label !== locationFilter) return false;
      if (groupFilter !== "all" && task.cattle_group_name !== groupFilter) return false;
      return true;
    });
  }, [
    tasks,
    statusFilter,
    today,
    assignedToMe,
    unassignedOnly,
    currentUserId,
    assigneeFilter,
    categoryFilter,
    priorityFilter,
    locationFilter,
    groupFilter,
  ]);

  const showGrouped =
    (statusFilter === "open" || statusFilter === "all") &&
    filtered.some((t) => isOpenTask(t.status));

  const grouped = useMemo(
    () => groupOpenTasks(filtered.filter((t) => isOpenTask(t.status)), today),
    [filtered, today],
  );

  const completedSorted = useMemo(
    () =>
      [...filtered.filter((t) => t.status === "done")].sort((a, b) =>
        (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at),
      ),
    [filtered],
  );

  const flatOpen = useMemo(
    () => sortTasksByUrgency(filtered.filter((t) => isOpenTask(t.status)), today),
    [filtered, today],
  );

  const selectClass =
    "flex h-11 min-h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary";

  function handleComplete(taskId: string) {
    if (completingId) return;
    setCompletingId(taskId);
    startTransition(async () => {
      const result = await completeTask(orgId, taskId);
      setCompletingId(null);
      if (!result.error) router.refresh();
    });
  }

  const statusFilters: Array<{ id: StatusFilter; label: string }> = [
    { id: "open", label: "Open" },
    { id: "due_today", label: "Due Today" },
    { id: "overdue", label: "Overdue" },
    { id: "completed", label: "Completed" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {statusFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={filterPillClass(statusFilter === f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {hasAdvanced ? (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm font-medium text-brown hover:underline"
          >
            {showAdvanced ? "Hide filters" : "More filters"}
          </button>
          {showAdvanced ? (
            <div className="mt-3 space-y-3 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4">
              <div className="flex flex-wrap gap-2">
                {currentUserId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAssignedToMe((v) => !v);
                      if (!assignedToMe) setUnassignedOnly(false);
                    }}
                    className={filterPillClass(assignedToMe)}
                  >
                    Assigned to Me
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setUnassignedOnly((v) => !v);
                    if (!unassignedOnly) setAssignedToMe(false);
                  }}
                  className={filterPillClass(unassignedOnly)}
                >
                  Unassigned
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assigneeOptions.length > 1 ? (
                  <div>
                    <label htmlFor="assignee-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                      Assignee
                    </label>
                    <select
                      id="assignee-filter"
                      value={assigneeFilter}
                      onChange={(e) => setAssigneeFilter(e.target.value)}
                      className={selectClass}
                    >
                      <option value="all">All assignees</option>
                      {assigneeOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {categoryOptions.length > 1 ? (
                  <div>
                    <label htmlFor="category-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                      Category
                    </label>
                    <select
                      id="category-filter"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className={selectClass}
                    >
                      <option value="all">All categories</option>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div>
                  <label htmlFor="priority-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                    Priority
                  </label>
                  <select
                    id="priority-filter"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All priorities</option>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                {locationOptions.length > 1 ? (
                  <div>
                    <label htmlFor="location-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                      Location
                    </label>
                    <select
                      id="location-filter"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className={selectClass}
                    >
                      <option value="all">All locations</option>
                      {locationOptions.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {groupOptions.length > 1 ? (
                  <div>
                    <label htmlFor="group-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                      Cattle group
                    </label>
                    <select
                      id="group-filter"
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className={selectClass}
                    >
                      <option value="all">All groups</option>
                      {groupOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState filter={statusFilter} />
      ) : statusFilter === "completed" ? (
        <ul className="space-y-3">
          {completedSorted.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onComplete={handleComplete}
                completing={completingId === task.id}
              />
            </li>
          ))}
        </ul>
      ) : showGrouped && grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(({ section, tasks: sectionTasks }) => (
            <section key={section}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
                {SECTION_LABELS[section]}
              </h2>
              <ul className="space-y-3">
                {sectionTasks.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      onComplete={handleComplete}
                      completing={completingId === task.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {statusFilter === "all" && completedSorted.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
                Completed
              </h2>
              <ul className="space-y-3">
                {completedSorted.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      onComplete={handleComplete}
                      completing={completingId === task.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {flatOpen.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onComplete={handleComplete}
                completing={completingId === task.id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
