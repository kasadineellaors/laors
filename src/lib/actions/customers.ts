"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidEmail } from "@/lib/email/validate";
import type { Database } from "@/types/database";

type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export type CustomerActionState = {
  error?: string;
  success?: string;
  customerId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE6.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("customers") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateCustomers() {
  revalidatePath("/setup/customers");
  revalidatePath("/invoices");
  revalidatePath("/invoices/new");
}

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

  if (!member || !["owner", "manager", "accountant"].includes(member.system_role)) {
    throw new Error("Not authorized");
  }
  return supabase;
}

function parseOptionalRate(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return undefined;
  return n;
}

export async function createCustomer(
  orgId: string,
  input: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    yardageRatePerHeadDay?: string;
    medicineMarkupPercent?: string;
    feedMarkupPercent?: string;
    notes?: string;
  },
): Promise<CustomerActionState> {
  const name = input.name.trim();
  if (!name) return { error: "Customer name is required" };

  const email = input.email?.trim();
  if (email && !isValidEmail(email)) return { error: "Enter a valid email address" };

  const yardage = parseOptionalRate(input.yardageRatePerHeadDay);
  if (yardage === undefined && input.yardageRatePerHeadDay?.trim()) {
    return { error: "Enter a valid yardage rate" };
  }
  const markup = parseOptionalRate(input.medicineMarkupPercent);
  if (markup === undefined && input.medicineMarkupPercent?.trim()) {
    return { error: "Enter a valid medicine markup percent" };
  }

  const feedMarkup = parseOptionalRate(input.feedMarkupPercent);
  if (feedMarkup === undefined && input.feedMarkupPercent?.trim()) {
    return { error: "Enter a valid feed markup percent" };
  }

  try {
    const supabase = await requireManager(orgId);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        organization_id: orgId,
        name,
        email: email || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        yardage_rate_per_head_day: yardage ?? null,
        medicine_markup_percent: markup ?? null,
        feed_markup_percent: feedMarkup ?? null,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateCustomers();
    return { success: "Customer added", customerId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateCustomer(
  orgId: string,
  customerId: string,
  input: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    yardageRatePerHeadDay?: string | null;
    medicineMarkupPercent?: string | null;
    feedMarkupPercent?: string | null;
    notes?: string | null;
  },
): Promise<CustomerActionState> {
  try {
    const supabase = await requireManager(orgId);
    const updates: CustomerUpdate = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return { error: "Customer name is required" };
      updates.name = name;
    }
    if (input.email !== undefined) {
      const nextEmail = input.email?.trim() || null;
      if (nextEmail && !isValidEmail(nextEmail)) return { error: "Enter a valid email address" };
      updates.email = nextEmail;
    }
    if (input.phone !== undefined) updates.phone = input.phone?.trim() || null;
    if (input.address !== undefined) updates.address = input.address?.trim() || null;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    if (input.yardageRatePerHeadDay !== undefined) {
      if (!input.yardageRatePerHeadDay?.trim()) {
        updates.yardage_rate_per_head_day = null;
      } else {
        const n = parseFloat(input.yardageRatePerHeadDay);
        if (Number.isNaN(n) || n < 0) return { error: "Enter a valid yardage rate" };
        updates.yardage_rate_per_head_day = n;
      }
    }
    if (input.medicineMarkupPercent !== undefined) {
      if (!input.medicineMarkupPercent?.trim()) {
        updates.medicine_markup_percent = null;
      } else {
        const n = parseFloat(input.medicineMarkupPercent);
        if (Number.isNaN(n) || n < 0) return { error: "Enter a valid medicine markup percent" };
        updates.medicine_markup_percent = n;
      }
    }
    if (input.feedMarkupPercent !== undefined) {
      if (!input.feedMarkupPercent?.trim()) {
        updates.feed_markup_percent = null;
      } else {
        const n = parseFloat(input.feedMarkupPercent);
        if (Number.isNaN(n) || n < 0) return { error: "Enter a valid feed markup percent" };
        updates.feed_markup_percent = n;
      }
    }

    const { error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", customerId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateCustomers();
    return { success: "Customer updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveCustomer(
  orgId: string,
  customerId: string,
): Promise<CustomerActionState> {
  try {
    const supabase = await requireManager(orgId);
    const { error } = await supabase
      .from("customers")
      .update({ is_active: false })
      .eq("id", customerId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateCustomers();
    return { success: "Customer archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
