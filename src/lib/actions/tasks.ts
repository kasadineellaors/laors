"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

import type { TaskPriority, TaskStatus } from "@/lib/tasks/types";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type TaskActionState = {
  error?: string;
  success?: string;
  taskId?: string;
};

const DB_PHASE3_HINT = "Run supabase/RUN_PHASE3.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("tasks") || message.includes("schema cache")) {
    return `${message} — ${DB_PHASE3_HINT}`;
  }
  return message;
}

function revalidateTasks() {
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

async function requireMember(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("organization_members")
    .select("system_role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) throw new Error("Not authorized");
  return { supabase, user, role: member.system_role };
}

export async function createTask(
  orgId: string,
  input: {
    title: string;
    description?: string;
    categoryId?: string;
    locationId?: string;
    cattleGroupId?: string;
    priority?: TaskPriority;
    dueDate?: string;
    assignedTo?: string;
    notes?: string;
  },
): Promise<TaskActionState> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        organization_id: orgId,
        title,
        description: input.description?.trim() || null,
        category_id: input.categoryId || null,
        location_id: input.locationId || null,
        cattle_group_id: input.cattleGroupId || null,
        priority: input.priority ?? "normal",
        due_date: input.dueDate || null,
        assigned_to: input.assignedTo || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateTasks();
    return { success: "Task created", taskId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateTask(
  orgId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    categoryId?: string | null;
    locationId?: string | null;
    cattleGroupId?: string | null;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignedTo?: string | null;
    notes?: string | null;
    status?: TaskStatus;
  },
): Promise<TaskActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);

    const updates: TaskUpdate = {};
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.description !== undefined) updates.description = input.description?.trim() || null;
    if (input.categoryId !== undefined) updates.category_id = input.categoryId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.dueDate !== undefined) updates.due_date = input.dueDate;
    if (input.assignedTo !== undefined) updates.assigned_to = input.assignedTo;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === "done") {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user.id;
      } else if (input.status === "open" || input.status === "in_progress") {
        updates.completed_at = null;
        updates.completed_by = null;
      }
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateTasks();
    revalidatePath(`/jobs/${taskId}`);
    return { success: "Task updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function completeTask(orgId: string, taskId: string): Promise<TaskActionState> {
  return updateTask(orgId, taskId, { status: "done" });
}

export async function archiveTask(orgId: string, taskId: string): Promise<TaskActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: false, status: "cancelled" })
      .eq("id", taskId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateTasks();
    return { success: "Task archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
