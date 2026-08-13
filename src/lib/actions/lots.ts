"use server";

import { createClient } from "@/lib/supabase/server";
import { applySaleHeadDelta } from "@/lib/actions/inventory";
import type { ProcessingType } from "@/lib/lots/types";
import { logAuditEvent } from "@/lib/audit/log";
import { revalidatePath } from "next/cache";

export type LotActionState = { error?: string; success?: string };

const DB_HINT = "Run supabase/RUN_PHASE18.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (
    message.includes("processing_events") ||
    message.includes("mortality_records") ||
    message.includes("lot_status") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateLot(groupId: string) {
  revalidatePath("/cattle");
  revalidatePath(`/cattle/groups/${groupId}`);
  revalidatePath(`/cattle/groups/${groupId}/closeout`);
  revalidatePath("/dashboard");
  revalidatePath("/health");
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

export async function closeLot(orgId: string, groupId: string): Promise<LotActionState> {
  try {
    const { supabase, role, user } = await requireMember(orgId);
    if (!["owner", "manager"].includes(role)) {
      return { error: "Managers only" };
    }

    const { data: group } = await supabase
      .from("cattle_groups")
      .select("lot_number, name")
      .eq("id", groupId)
      .eq("organization_id", orgId)
      .maybeSingle();

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("cattle_groups")
      .update({ lot_status: "closed", closed_at: today })
      .eq("id", groupId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };

    await logAuditEvent(orgId, {
      action: "lot.closed",
      tableName: "cattle_groups",
      recordId: groupId,
      userId: user.id,
      newData: {
        lot_label: group?.lot_number || group?.name || "Lot",
      },
    });

    revalidateLot(groupId);
    return { success: "Lot closed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function reopenLot(orgId: string, groupId: string): Promise<LotActionState> {
  try {
    const { supabase, role, user } = await requireMember(orgId);
    if (!["owner", "manager"].includes(role)) {
      return { error: "Managers only" };
    }

    const { error } = await supabase
      .from("cattle_groups")
      .update({ lot_status: "active", closed_at: null })
      .eq("id", groupId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateLot(groupId);
    return { success: "Lot reopened" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createProcessingEvent(
  orgId: string,
  groupId: string,
  input: {
    processedAt?: string;
    headCount: number;
    processingType: ProcessingType;
    chuteCharge?: number;
    laborCharge?: number;
    processingFee?: number;
    medicineCost?: number;
    notes?: string;
  },
): Promise<LotActionState> {
  if (!input.headCount || input.headCount <= 0) {
    return { error: "Enter head processed" };
  }

  try {
    const { supabase, user } = await requireMember(orgId);
    const { error } = await supabase.from("processing_events").insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      processed_at: input.processedAt || new Date().toISOString().slice(0, 10),
      head_count: input.headCount,
      processing_type: input.processingType,
      chute_charge: input.chuteCharge ?? 0,
      labor_charge: input.laborCharge ?? 0,
      processing_fee: input.processingFee ?? 0,
      medicine_cost: input.medicineCost ?? 0,
      notes: input.notes?.trim() || null,
      created_by: user.id,
    });

    if (error) return { error: formatDbError(error.message) };
    revalidateLot(groupId);
    return { success: "Processing logged" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function recordMortality(
  orgId: string,
  groupId: string,
  input: {
    diedAt?: string;
    headCount?: number;
    weightLbs?: number;
    cause?: string;
    disposalMethod?: string;
    valueLost?: number;
    notes?: string;
    deductInventory?: boolean;
  },
): Promise<LotActionState> {
  const headCount = input.headCount ?? 1;
  if (headCount <= 0) return { error: "Enter head count" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const { error } = await supabase.from("mortality_records").insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      died_at: input.diedAt || new Date().toISOString().slice(0, 10),
      head_count: headCount,
      weight_lbs: input.weightLbs ?? null,
      cause: input.cause?.trim() || null,
      disposal_method: input.disposalMethod?.trim() || null,
      value_lost: input.valueLost ?? null,
      notes: input.notes?.trim() || null,
      created_by: user.id,
    });

    if (error) return { error: formatDbError(error.message) };

    if (input.deductInventory !== false) {
      const delta = await applySaleHeadDelta(
        orgId,
        groupId,
        -headCount,
        `Death recorded — ${input.cause?.trim() || "mortality"}`,
      );
      if (delta.error) return { error: delta.error };
    }

    revalidateLot(groupId);
    return { success: "Mortality recorded" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

async function assertProcessingEditable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  eventId: string,
) {
  const { data } = await supabase
    .from("processing_events")
    .select("id, cattle_group_id, invoiced_at, is_active")
    .eq("id", eventId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!data || !data.is_active) return { error: "Processing event not found" };
  if (data.invoiced_at) return { error: "Already invoiced — cannot edit this processing event" };
  return { data };
}

export async function updateProcessingEvent(
  orgId: string,
  groupId: string,
  eventId: string,
  input: {
    processedAt?: string;
    headCount: number;
    processingType: ProcessingType;
    chuteCharge?: number;
    laborCharge?: number;
    processingFee?: number;
    medicineCost?: number;
    notes?: string;
  },
): Promise<LotActionState> {
  if (!input.headCount || input.headCount <= 0) {
    return { error: "Enter head processed" };
  }

  try {
    const { supabase } = await requireMember(orgId);
    const check = await assertProcessingEditable(supabase, orgId, eventId);
    if ("error" in check) return { error: check.error };

    const { error } = await supabase
      .from("processing_events")
      .update({
        processed_at: input.processedAt || new Date().toISOString().slice(0, 10),
        head_count: input.headCount,
        processing_type: input.processingType,
        chute_charge: input.chuteCharge ?? 0,
        labor_charge: input.laborCharge ?? 0,
        processing_fee: input.processingFee ?? 0,
        medicine_cost: input.medicineCost ?? 0,
        notes: input.notes?.trim() || null,
      })
      .eq("id", eventId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateLot(groupId);
    return { success: "Processing updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveProcessingEvent(
  orgId: string,
  groupId: string,
  eventId: string,
): Promise<LotActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const check = await assertProcessingEditable(supabase, orgId, eventId);
    if ("error" in check) return { error: check.error };

    const { error } = await supabase
      .from("processing_events")
      .update({ is_active: false })
      .eq("id", eventId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateLot(groupId);
    return { success: "Processing removed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

async function assertMortalityEditable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  recordId: string,
) {
  const { data } = await supabase
    .from("mortality_records")
    .select("id, cattle_group_id, head_count, invoiced_at, is_active")
    .eq("id", recordId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!data || !data.is_active) return { error: "Death record not found" };
  if (data.invoiced_at) return { error: "Already invoiced — cannot edit this death record" };
  return { data };
}

export async function updateMortalityRecord(
  orgId: string,
  groupId: string,
  recordId: string,
  input: {
    diedAt?: string;
    headCount: number;
    weightLbs?: number | null;
    cause?: string;
    disposalMethod?: string;
    valueLost?: number | null;
    notes?: string;
  },
): Promise<LotActionState> {
  if (!input.headCount || input.headCount <= 0) {
    return { error: "Enter head count" };
  }

  try {
    const { supabase } = await requireMember(orgId);
    const check = await assertMortalityEditable(supabase, orgId, recordId);
    if ("error" in check) return { error: check.error };

    const oldHead = check.data.head_count;
    const headDelta = oldHead - input.headCount;
    if (headDelta !== 0) {
      const delta = await applySaleHeadDelta(
        orgId,
        groupId,
        headDelta,
        `Death record corrected — ${input.cause?.trim() || "mortality"}`,
      );
      if (delta.error) return { error: delta.error };
    }

    const { error } = await supabase
      .from("mortality_records")
      .update({
        died_at: input.diedAt || new Date().toISOString().slice(0, 10),
        head_count: input.headCount,
        weight_lbs: input.weightLbs ?? null,
        cause: input.cause?.trim() || null,
        disposal_method: input.disposalMethod?.trim() || null,
        value_lost: input.valueLost ?? null,
        notes: input.notes?.trim() || null,
      })
      .eq("id", recordId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateLot(groupId);
    return { success: "Death record updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveMortalityRecord(
  orgId: string,
  groupId: string,
  recordId: string,
): Promise<LotActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const check = await assertMortalityEditable(supabase, orgId, recordId);
    if ("error" in check) return { error: check.error };

    const delta = await applySaleHeadDelta(
      orgId,
      groupId,
      check.data.head_count,
      "Death record removed — head restored",
    );
    if (delta.error) return { error: delta.error };

    const { error } = await supabase
      .from("mortality_records")
      .update({ is_active: false })
      .eq("id", recordId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateLot(groupId);
    return { success: "Death record removed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
