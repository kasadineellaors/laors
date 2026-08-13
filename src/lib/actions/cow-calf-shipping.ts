"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applySaleHeadDelta } from "@/lib/actions/inventory";
import type { ShippingDirection, ShippingReason } from "@/lib/cow-calf/shipping-constants";

export type ShippingActionState = { error?: string; success?: string; id?: string };

const DB_HINT = "Run supabase/RUN_PHASE48.sql in Supabase SQL Editor, then retry.";

function revalidateShipping() {
  revalidatePath("/cow-calf/shipping");
  revalidatePath("/feedyard");
  revalidatePath("/cattle");
  revalidatePath("/reports/owner-totals");
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
  return { supabase, user };
}

export async function saveCowCalfShipping(
  orgId: string,
  input: {
    shippedAt?: string;
    direction: ShippingDirection;
    headCount: number;
    weightLbs?: number;
    cowCalfHerdId?: string;
    cattleGroupId?: string;
    sourceLocationId?: string;
    destinationLocationId?: string;
    sourceName?: string;
    destinationName?: string;
    reason: ShippingReason;
    notes?: string;
    adjustInventory?: boolean;
  },
): Promise<ShippingActionState> {
  if (!input.headCount || input.headCount <= 0) {
    return { error: "Enter head count" };
  }

  try {
    const { supabase, user } = await requireMember(orgId);
    const { data, error } = await supabase
      .from("cow_calf_shipping_records")
      .insert({
        organization_id: orgId,
        shipped_at: input.shippedAt ?? new Date().toISOString().slice(0, 10),
        direction: input.direction,
        head_count: input.headCount,
        weight_lbs: input.weightLbs ?? null,
        cow_calf_herd_id: input.cowCalfHerdId || null,
        cattle_group_id: input.cattleGroupId || null,
        source_location_id: input.sourceLocationId || null,
        destination_location_id: input.destinationLocationId || null,
        source_name: input.sourceName?.trim() || null,
        destination_name: input.destinationName?.trim() || null,
        reason: input.reason,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: `${error.message} — ${DB_HINT}` };

    if (input.cattleGroupId && input.direction === "out" && input.adjustInventory) {
      const delta = await applySaleHeadDelta(
        orgId,
        input.cattleGroupId,
        -input.headCount,
        `Shipped out — ${input.reason}`,
      );
      if (delta.error) return { error: delta.error };
    }

    revalidateShipping();
    return { success: "Shipping recorded", id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function saveCattleShipping(
  orgId: string,
  input: {
    cattleGroupId: string;
    shippedAt?: string;
    direction: ShippingDirection;
    headCount: number;
    weightLbs?: number;
    sourceLocationId?: string;
    destinationLocationId?: string;
    sourceName?: string;
    destinationName?: string;
    reason: ShippingReason;
    notes?: string;
    adjustInventory?: boolean;
  },
): Promise<ShippingActionState> {
  if (!input.headCount || input.headCount <= 0) {
    return { error: "Enter head count" };
  }

  try {
    const { supabase, user } = await requireMember(orgId);
    const adjust = input.adjustInventory !== false && input.direction === "out";

    const { data, error } = await supabase
      .from("cattle_shipping_records")
      .insert({
        organization_id: orgId,
        cattle_group_id: input.cattleGroupId,
        shipped_at: input.shippedAt ?? new Date().toISOString().slice(0, 10),
        direction: input.direction,
        head_count: input.headCount,
        weight_lbs: input.weightLbs ?? null,
        source_location_id: input.sourceLocationId || null,
        destination_location_id: input.destinationLocationId || null,
        source_name: input.sourceName?.trim() || null,
        destination_name: input.destinationName?.trim() || null,
        reason: input.reason,
        notes: input.notes?.trim() || null,
        inventory_adjusted: adjust,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: `${error.message} — ${DB_HINT}` };

    if (adjust) {
      const delta = await applySaleHeadDelta(
        orgId,
        input.cattleGroupId,
        -input.headCount,
        `Shipped out — ${input.reason}`,
      );
      if (delta.error) return { error: delta.error };
    }

    revalidateShipping();
    return { success: "Shipping recorded", id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveCowCalfShipping(
  orgId: string,
  shippingId: string,
): Promise<ShippingActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("cow_calf_shipping_records")
      .update({ is_active: false })
      .eq("id", shippingId)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
    revalidateShipping();
    return { success: "Shipping record archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
