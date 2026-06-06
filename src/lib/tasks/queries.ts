import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import type { OrgMemberOption, TaskRecord, TaskStatus } from "./types";

export async function listTasks(
  orgId: string,
  filter: "open" | "all" = "open",
): Promise<TaskRecord[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filter === "open") {
    query = query.in("status", ["open", "in_progress"]);
  }

  const { data: tasks, error } = await query;
  if (error || !tasks?.length) return [];

  return enrichTasks(orgId, tasks);
}

export async function getTask(orgId: string, taskId: string): Promise<TaskRecord | null> {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", taskId)
    .eq("is_active", true)
    .maybeSingle();

  if (!task) return null;
  const [enriched] = await enrichTasks(orgId, [task]);
  return enriched ?? null;
}

export async function countOpenTasks(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("status", ["open", "in_progress"]);

  return count ?? 0;
}

export async function listOrgMembers(orgId: string): Promise<OrgMemberOption[]> {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const names = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  return members.map((m) => ({
    user_id: m.user_id,
    name: names.get(m.user_id) ?? "Team member",
  }));
}

async function enrichTasks(
  orgId: string,
  tasks: Array<Record<string, unknown>>,
): Promise<TaskRecord[]> {
  const supabase = await createClient();

  const categoryIds = [...new Set(tasks.map((t) => t.category_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(tasks.map((t) => t.location_id).filter(Boolean))] as string[];
  const groupIds = [...new Set(tasks.map((t) => t.cattle_group_id).filter(Boolean))] as string[];
  const profileIds = [
    ...new Set(
      tasks.flatMap((t) => [t.assigned_to, t.created_by].filter(Boolean)),
    ),
  ] as string[];

  const [
    { data: categories },
    { data: locations },
    { data: groups },
    { data: profiles },
  ] = await Promise.all([
    categoryIds.length
      ? supabase.from("task_categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("locations").select("id, name, parent_id, depth, path").in("id", locationIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const catNames = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const profileNames = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  const locRows = (locations ?? []) as LocationRow[];
  const allLocs =
    locRows.length > 0
      ? (
          await supabase
            .from("locations")
            .select("id, name, parent_id, depth, path")
            .eq("organization_id", orgId)
            .eq("is_active", true)
        ).data ?? []
      : [];
  const locLabels = new Map(
    locRows.map((l) => [
      l.id,
      getBreadcrumb(l.id, allLocs as LocationRow[])
        .map((x) => x.name)
        .join(" › "),
    ]),
  );

  return tasks.map((t) => ({
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string | null) ?? null,
    status: t.status as TaskStatus,
    priority: t.priority as TaskRecord["priority"],
    due_date: (t.due_date as string | null) ?? null,
    notes: (t.notes as string | null) ?? null,
    category_id: (t.category_id as string | null) ?? null,
    category_name: t.category_id ? catNames.get(t.category_id as string) ?? null : null,
    location_id: (t.location_id as string | null) ?? null,
    location_label: t.location_id ? locLabels.get(t.location_id as string) ?? null : null,
    cattle_group_id: (t.cattle_group_id as string | null) ?? null,
    cattle_group_name: t.cattle_group_id
      ? groupNames.get(t.cattle_group_id as string) ?? null
      : null,
    assigned_to: (t.assigned_to as string | null) ?? null,
    assigned_to_name: t.assigned_to
      ? profileNames.get(t.assigned_to as string) ?? null
      : null,
    created_by: (t.created_by as string | null) ?? null,
    created_by_name: t.created_by ? profileNames.get(t.created_by as string) ?? null : null,
    completed_at: (t.completed_at as string | null) ?? null,
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
  }));
}
