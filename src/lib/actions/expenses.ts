"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

export type ExpenseActionState = { error?: string; success?: string };

type LotExpenseUpdate = Database["public"]["Tables"]["lot_expenses"]["Update"];

const DB_HINT = "Run supabase/RUN_PHASE20.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("lot_expenses") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateLotExpense(groupId: string) {
  revalidatePath("/cattle");
  revalidatePath(`/cattle/groups/${groupId}`);
  revalidatePath(`/cattle/groups/${groupId}/closeout`);
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
  return { supabase, user };
}

export async function createLotExpense(
  orgId: string,
  groupId: string,
  input: {
    expenseDate?: string;
    amount: number;
    financialCategoryId?: string;
    description?: string;
    vendorName?: string;
    notes?: string;
  },
): Promise<ExpenseActionState> {
  if (!input.amount || input.amount < 0) return { error: "Enter an amount" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const { error } = await supabase.from("lot_expenses").insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      expense_date: input.expenseDate || new Date().toISOString().slice(0, 10),
      amount: input.amount,
      financial_category_id: input.financialCategoryId || null,
      description: input.description?.trim() || null,
      vendor_name: input.vendorName?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: user.id,
    });

    if (error) return { error: formatDbError(error.message) };
    revalidateLotExpense(groupId);
    return { success: "Expense recorded" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveLotExpense(
  orgId: string,
  expenseId: string,
  groupId: string,
): Promise<ExpenseActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("lot_expenses")
      .update({ is_active: false })
      .eq("id", expenseId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateLotExpense(groupId);
    return { success: "Expense removed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateLotExpense(
  orgId: string,
  expenseId: string,
  groupId: string,
  input: {
    expenseDate?: string;
    amount?: number;
    financialCategoryId?: string | null;
    description?: string | null;
    vendorName?: string | null;
    notes?: string | null;
  },
): Promise<ExpenseActionState> {
  if (input.amount !== undefined && input.amount < 0) {
    return { error: "Enter a valid amount" };
  }

  try {
    const { supabase } = await requireMember(orgId);
    const updates: LotExpenseUpdate = {};
    if (input.expenseDate !== undefined) updates.expense_date = input.expenseDate;
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.financialCategoryId !== undefined) {
      updates.financial_category_id = input.financialCategoryId || null;
    }
    if (input.description !== undefined) updates.description = input.description?.trim() || null;
    if (input.vendorName !== undefined) updates.vendor_name = input.vendorName?.trim() || null;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return { error: "No changes to save" };
    }

    const { error } = await supabase
      .from("lot_expenses")
      .update(updates)
      .eq("id", expenseId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateLotExpense(groupId);
    return { success: "Expense updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
