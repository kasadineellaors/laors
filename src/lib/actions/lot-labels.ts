"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./onboarding";

async function requireManager(orgId: string) {
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

  if (!member || !["owner", "manager"].includes(member.system_role)) {
    throw new Error("Not authorized");
  }

  return supabase;
}

function revalidateLotLabels() {
  revalidatePath("/setup");
  revalidatePath("/setup/lot-labels");
  revalidatePath("/cattle");
  revalidatePath("/cattle/new");
}

export async function createLotLabel(orgId: string, name: string): Promise<ActionState> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Enter a lot name" };

  try {
    const supabase = await requireManager(orgId);
    const { error } = await supabase.from("lot_labels").insert({
      organization_id: orgId,
      name: trimmed,
    });
    if (error) return { error: error.message };
    revalidateLotLabels();
    return { success: "Lot label added" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateLotLabel(
  orgId: string,
  id: string,
  name: string,
): Promise<ActionState> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Enter a lot name" };

  try {
    const supabase = await requireManager(orgId);
    const { error } = await supabase
      .from("lot_labels")
      .update({ name: trimmed })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
    revalidateLotLabels();
    return { success: "Updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveLotLabel(orgId: string, id: string): Promise<ActionState> {
  try {
    const supabase = await requireManager(orgId);
    const { error } = await supabase
      .from("lot_labels")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
    revalidateLotLabels();
    return { success: "Archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
