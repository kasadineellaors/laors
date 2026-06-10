"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type { FeedingContext } from "@/lib/feed/types";

type RationUpdate = Database["public"]["Tables"]["feed_rations"]["Update"];
type FeedingUpdate = Database["public"]["Tables"]["feeding_records"]["Update"];

export type FeedActionState = {
  error?: string;
  success?: string;
  rationId?: string;
  feedingId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE10.sql or supabase db push, then retry.";

function formatDbError(message: string): string {
  if (
    message.includes("feed_rations") ||
    message.includes("feeding_records") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateFeed() {
  revalidatePath("/feed");
  revalidatePath("/feed/rations");
  revalidatePath("/feed/log");
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/feed");
  revalidatePath("/dashboard");
  revalidatePath("/invoices/generate");
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

async function requireManager(orgId: string) {
  const ctx = await requireMember(orgId);
  if (!["owner", "manager"].includes(ctx.role)) {
    throw new Error("Managers only");
  }
  return ctx;
}

export async function createFeedRation(
  orgId: string,
  input: {
    name: string;
    unit?: string;
    pricePerUnit?: number;
    notes?: string;
  },
): Promise<FeedActionState> {
  const name = input.name.trim();
  if (!name) return { error: "Ration name is required" };

  try {
    const { supabase, user } = await requireManager(orgId);
    const { data, error } = await supabase
      .from("feed_rations")
      .insert({
        organization_id: orgId,
        name,
        unit: input.unit?.trim() || "ton",
        price_per_unit: input.pricePerUnit ?? null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    return { success: "Ration saved", rationId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateFeedRation(
  orgId: string,
  rationId: string,
  input: {
    name?: string;
    unit?: string;
    pricePerUnit?: number | null;
    notes?: string | null;
  },
): Promise<FeedActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const updates: RationUpdate = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.unit !== undefined) updates.unit = input.unit.trim() || "ton";
    if (input.pricePerUnit !== undefined) updates.price_per_unit = input.pricePerUnit;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    const { error } = await supabase
      .from("feed_rations")
      .update(updates)
      .eq("id", rationId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    revalidatePath(`/feed/rations/${rationId}`);
    return { success: "Ration updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveFeedRation(orgId: string, rationId: string): Promise<FeedActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const { error } = await supabase
      .from("feed_rations")
      .update({ is_active: false })
      .eq("id", rationId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    return { success: "Ration archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createFeeding(
  orgId: string,
  input: {
    feedRationId: string;
    quantity: number;
    fedAt?: string;
    cattleGroupId?: string;
    locationId?: string;
    ownershipGroupId?: string;
    headCount?: number;
    fedBy?: string;
    notes?: string;
    feedingContext?: FeedingContext;
  },
): Promise<FeedActionState> {
  if (!input.feedRationId) return { error: "Select a feed ration" };
  if (!input.quantity || input.quantity <= 0) return { error: "Enter feed amount" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const { data, error } = await supabase
      .from("feeding_records")
      .insert({
        organization_id: orgId,
        feed_ration_id: input.feedRationId,
        quantity: input.quantity,
        fed_at: input.fedAt || new Date().toISOString().slice(0, 10),
        cattle_group_id: input.cattleGroupId || null,
        location_id: input.locationId || null,
        ownership_group_id: input.ownershipGroupId || null,
        head_count: input.headCount ?? null,
        fed_by: input.fedBy || user.id,
        notes: input.notes?.trim() || null,
        feeding_context: input.feedingContext ?? "general",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    return { success: "Feeding logged", feedingId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateFeeding(
  orgId: string,
  feedingId: string,
  input: {
    feedRationId?: string;
    quantity?: number;
    fedAt?: string;
    cattleGroupId?: string | null;
    locationId?: string | null;
    ownershipGroupId?: string | null;
    headCount?: number | null;
    fedBy?: string | null;
    notes?: string | null;
  },
): Promise<FeedActionState> {
  try {
    await requireMember(orgId);
    const supabase = await createClient();

    const updates: FeedingUpdate = {};
    if (input.feedRationId !== undefined) updates.feed_ration_id = input.feedRationId;
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    if (input.fedAt !== undefined) updates.fed_at = input.fedAt;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.ownershipGroupId !== undefined) updates.ownership_group_id = input.ownershipGroupId;
    if (input.headCount !== undefined) updates.head_count = input.headCount;
    if (input.fedBy !== undefined) updates.fed_by = input.fedBy;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    const { error } = await supabase
      .from("feeding_records")
      .update(updates)
      .eq("id", feedingId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    revalidatePath(`/feed/log/${feedingId}`);
    return { success: "Feeding updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveFeeding(orgId: string, feedingId: string): Promise<FeedActionState> {
  try {
    await requireMember(orgId);
    const supabase = await createClient();
    const { error } = await supabase
      .from("feeding_records")
      .update({ is_active: false })
      .eq("id", feedingId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    return { success: "Feeding archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
