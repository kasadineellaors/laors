"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { applySaleHeadDelta } from "@/lib/actions/inventory";
import type { Database } from "@/types/database";

type SaleUpdate = Database["public"]["Tables"]["sales_records"]["Update"];

export type SaleActionState = {
  error?: string;
  success?: string;
  saleId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE4.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("sales_records") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateSales() {
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/cattle");
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

function computeAmounts(input: {
  totalAmount?: number;
  pricePerHead?: number;
  headCount: number;
}): { total: number | null; perHead: number | null } {
  if (input.totalAmount != null && input.totalAmount >= 0) {
    const perHead =
      input.headCount > 0
        ? Math.round((input.totalAmount / input.headCount) * 100) / 100
        : null;
    return { total: input.totalAmount, perHead: input.pricePerHead ?? perHead };
  }
  if (input.pricePerHead != null && input.pricePerHead >= 0) {
    return {
      total: Math.round(input.pricePerHead * input.headCount * 100) / 100,
      perHead: input.pricePerHead,
    };
  }
  return { total: null, perHead: null };
}

export async function createSale(
  orgId: string,
  input: {
    saleDate?: string;
    buyerName?: string;
    customerId?: string;
    cattleGroupId?: string;
    locationId?: string;
    headCount: number;
    totalAmount?: number;
    pricePerHead?: number;
    financialCategoryId?: string;
    deductFromInventory?: boolean;
    notes?: string;
  },
): Promise<SaleActionState> {
  if (input.headCount <= 0) return { error: "Head count must be greater than zero" };
  if (input.deductFromInventory && !input.cattleGroupId) {
    return { error: "Select a cattle group to deduct from inventory" };
  }

  const { total, perHead } = computeAmounts({
    totalAmount: input.totalAmount,
    pricePerHead: input.pricePerHead,
    headCount: input.headCount,
  });

  try {
    const { supabase, user } = await requireMember(orgId);

    if (input.deductFromInventory && input.cattleGroupId) {
      const deduct = await applySaleHeadDelta(
        orgId,
        input.cattleGroupId,
        -input.headCount,
        `Sale${input.buyerName ? ` to ${input.buyerName.trim()}` : ""}`,
      );
      if (deduct.error) return { error: deduct.error };
    }

    const { data, error } = await supabase
      .from("sales_records")
      .insert({
        organization_id: orgId,
        sale_date: input.saleDate || new Date().toISOString().slice(0, 10),
        buyer_name: input.buyerName?.trim() || null,
        customer_id: input.customerId || null,
        cattle_group_id: input.cattleGroupId || null,
        location_id: input.locationId || null,
        head_count: input.headCount,
        total_amount: total,
        price_per_head: perHead,
        financial_category_id: input.financialCategoryId || null,
        inventory_deducted: Boolean(input.deductFromInventory && input.cattleGroupId),
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      if (input.deductFromInventory && input.cattleGroupId) {
        await applySaleHeadDelta(
          orgId,
          input.cattleGroupId,
          input.headCount,
          "Rollback — sale save failed",
        );
      }
      return { error: formatDbError(error.message) };
    }

    revalidateSales();
    return { success: "Sale recorded", saleId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateSale(
  orgId: string,
  saleId: string,
  input: {
    saleDate?: string;
    buyerName?: string | null;
    customerId?: string | null;
    locationId?: string | null;
    totalAmount?: number | null;
    pricePerHead?: number | null;
    financialCategoryId?: string | null;
    notes?: string | null;
  },
): Promise<SaleActionState> {
  try {
    const { supabase } = await requireMember(orgId);

    const updates: SaleUpdate = {};
    if (input.saleDate !== undefined) updates.sale_date = input.saleDate;
    if (input.buyerName !== undefined) updates.buyer_name = input.buyerName?.trim() || null;
    if (input.customerId !== undefined) updates.customer_id = input.customerId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.financialCategoryId !== undefined) {
      updates.financial_category_id = input.financialCategoryId;
    }
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    if (input.totalAmount !== undefined || input.pricePerHead !== undefined) {
      const { data: existing } = await supabase
        .from("sales_records")
        .select("head_count")
        .eq("id", saleId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!existing) return { error: "Sale not found" };

      const { total, perHead } = computeAmounts({
        totalAmount: input.totalAmount ?? undefined,
        pricePerHead: input.pricePerHead ?? undefined,
        headCount: existing.head_count,
      });
      updates.total_amount = input.totalAmount === null ? null : total;
      updates.price_per_head = input.pricePerHead === null ? null : perHead;
    }

    const { error } = await supabase
      .from("sales_records")
      .update(updates)
      .eq("id", saleId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateSales();
    revalidatePath(`/sales/${saleId}`);
    return { success: "Sale updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveSale(orgId: string, saleId: string): Promise<SaleActionState> {
  try {
    const { supabase } = await requireMember(orgId);

    const { data: sale } = await supabase
      .from("sales_records")
      .select("id")
      .eq("id", saleId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!sale) return { error: "Sale not found" };

    const { error } = await supabase
      .from("sales_records")
      .update({ is_active: false })
      .eq("id", saleId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateSales();
    return { success: "Sale archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
