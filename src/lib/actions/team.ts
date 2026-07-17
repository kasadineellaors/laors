"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SystemRole } from "@/types/database";
import { sanitizeModuleIds } from "@/lib/auth/modules";

export type TeamActionState = {
  error?: string;
  success?: string;
};

async function requireOwner(orgId: string) {
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

  if (!member || member.system_role !== "owner") {
    throw new Error("Only ranch owners can change access");
  }

  return { supabase, user };
}

export async function updateTeamMember(
  orgId: string,
  memberId: string,
  input: {
    systemRole?: SystemRole;
    visibleModules?: string[] | null;
  },
): Promise<TeamActionState> {
  if (!input.systemRole && input.visibleModules === undefined) {
    return { error: "No changes to save" };
  }

  try {
    const { supabase } = await requireOwner(orgId);

    const { data: target, error: fetchError } = await supabase
      .from("organization_members")
      .select("id, system_role")
      .eq("id", memberId)
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!target) return { error: "Team member not found" };
    if (target.system_role === "owner") {
      return { error: "Owner access cannot be changed" };
    }

    const updates: {
      system_role?: SystemRole;
      visible_modules?: string[] | null;
    } = {};

    if (input.systemRole !== undefined) {
      if (input.systemRole === "owner") {
        return { error: "Promote to owner from account settings is not supported yet" };
      }
      updates.system_role = input.systemRole;
    }

    if (input.visibleModules !== undefined) {
      const modules = sanitizeModuleIds(input.visibleModules ?? []);
      updates.visible_modules = modules.length > 0 ? modules : null;
    }

    const { error } = await supabase
      .from("organization_members")
      .update(updates)
      .eq("id", memberId)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };

    revalidatePath("/setup/team");
    return { success: "Team member updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update" };
  }
}
