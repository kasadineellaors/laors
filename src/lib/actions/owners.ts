"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidEmail } from "@/lib/email/validate";
import type { Database } from "@/types/database";

type OwnerUpdate = Database["public"]["Tables"]["owners"]["Update"];

export type OwnerActionState = {
  error?: string;
  success?: string;
  ownerId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE33.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("owners") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateOwners() {
  revalidatePath("/setup/owners");
  revalidatePath("/setup/customers");
  revalidatePath("/setup/ownership");
  revalidatePath("/invoices");
  revalidatePath("/cattle");
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

export async function createOwner(
  orgId: string,
  input: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contactName?: string;
    ownershipType?: string;
    isOwnershipGroup?: boolean;
    yardageRatePerHeadDay?: string;
    medicineMarkupPercent?: string;
    feedMarkupPercent?: string;
    notes?: string;
    members?: Array<{ memberOwnerId: string; percentage: string }>;
  },
): Promise<OwnerActionState> {
  const name = input.name.trim();
  if (!name) return { error: "Owner name is required" };

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

  if (input.isOwnershipGroup) {
    const members = input.members ?? [];
    if (members.length < 2) {
      return { error: "Ownership groups need at least two members with split percentages" };
    }
    const total = members.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      return { error: "Member percentages must total 100%" };
    }
  }

  try {
    const supabase = await requireManager(orgId);
    const { data, error } = await supabase
      .from("owners")
      .insert({
        organization_id: orgId,
        name,
        email: email || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        contact_name: input.contactName?.trim() || null,
        ownership_type: input.ownershipType?.trim() || null,
        is_ownership_group: Boolean(input.isOwnershipGroup),
        yardage_rate_per_head_day: yardage ?? null,
        medicine_markup_percent: markup ?? null,
        feed_markup_percent: feedMarkup ?? null,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };

    if (input.isOwnershipGroup && input.members?.length) {
      const { error: memberError } = await supabase.from("owner_group_members").insert(
        input.members.map((m) => ({
          organization_id: orgId,
          group_owner_id: data.id,
          member_owner_id: m.memberOwnerId,
          percentage: parseFloat(m.percentage),
        })),
      );
      if (memberError) return { error: formatDbError(memberError.message) };
    }

    revalidateOwners();
    return { success: "Owner added", ownerId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateOwner(
  orgId: string,
  ownerId: string,
  input: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    contactName?: string;
    ownershipType?: string;
    isOwnershipGroup?: boolean;
    yardageRatePerHeadDay?: string;
    medicineMarkupPercent?: string;
    feedMarkupPercent?: string;
    notes?: string;
    members?: Array<{ memberOwnerId: string; percentage: string }>;
  },
): Promise<OwnerActionState> {
  try {
    const supabase = await requireManager(orgId);
    const updates: OwnerUpdate = {};

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.email !== undefined) {
      const email = input.email.trim();
      if (email && !isValidEmail(email)) return { error: "Enter a valid email address" };
      updates.email = email || null;
    }
    if (input.phone !== undefined) updates.phone = input.phone.trim() || null;
    if (input.address !== undefined) updates.address = input.address.trim() || null;
    if (input.contactName !== undefined) updates.contact_name = input.contactName.trim() || null;
    if (input.ownershipType !== undefined) updates.ownership_type = input.ownershipType.trim() || null;
    if (input.isOwnershipGroup !== undefined) updates.is_ownership_group = input.isOwnershipGroup;
    if (input.notes !== undefined) updates.notes = input.notes.trim() || null;

    if (input.yardageRatePerHeadDay !== undefined) {
      const yardage = parseOptionalRate(input.yardageRatePerHeadDay);
      if (yardage === undefined && input.yardageRatePerHeadDay.trim()) {
        return { error: "Enter a valid yardage rate" };
      }
      updates.yardage_rate_per_head_day = yardage ?? null;
    }
    if (input.medicineMarkupPercent !== undefined) {
      const markup = parseOptionalRate(input.medicineMarkupPercent);
      if (markup === undefined && input.medicineMarkupPercent.trim()) {
        return { error: "Enter a valid medicine markup percent" };
      }
      updates.medicine_markup_percent = markup ?? null;
    }
    if (input.feedMarkupPercent !== undefined) {
      const feedMarkup = parseOptionalRate(input.feedMarkupPercent);
      if (feedMarkup === undefined && input.feedMarkupPercent.trim()) {
        return { error: "Enter a valid feed markup percent" };
      }
      updates.feed_markup_percent = feedMarkup ?? null;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("owners")
        .update(updates)
        .eq("id", ownerId)
        .eq("organization_id", orgId);
      if (error) return { error: formatDbError(error.message) };
    }

    if (input.members !== undefined) {
      const total = input.members.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);
      if (input.members.length > 0 && Math.abs(total - 100) > 0.01) {
        return { error: "Member percentages must total 100%" };
      }
      await supabase.from("owner_group_members").delete().eq("group_owner_id", ownerId);
      if (input.members.length > 0) {
        const { error: memberError } = await supabase.from("owner_group_members").insert(
          input.members.map((m) => ({
            organization_id: orgId,
            group_owner_id: ownerId,
            member_owner_id: m.memberOwnerId,
            percentage: parseFloat(m.percentage),
          })),
        );
        if (memberError) return { error: formatDbError(memberError.message) };
      }
    }

    revalidateOwners();
    return { success: "Owner updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveOwner(orgId: string, ownerId: string): Promise<OwnerActionState> {
  try {
    const supabase = await requireManager(orgId);

    const { count } = await supabase
      .from("cattle_groups")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("owner_id", ownerId)
      .eq("is_active", true);

    if ((count ?? 0) > 0) {
      return { error: "Cannot archive — active cattle groups still use this owner" };
    }

    const { error } = await supabase
      .from("owners")
      .update({ is_active: false })
      .eq("id", ownerId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateOwners();
    return { success: "Owner archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createOwnerMiscCharge(
  orgId: string,
  input: {
    ownerId: string;
    cattleGroupId?: string;
    chargeDate?: string;
    description: string;
    amount: string;
    notes?: string;
  },
): Promise<OwnerActionState> {
  const description = input.description.trim();
  if (!description) return { error: "Description is required" };
  const amount = parseFloat(input.amount);
  if (Number.isNaN(amount) || amount < 0) return { error: "Enter a valid amount" };

  try {
    const supabase = await requireManager(orgId);
    const { error } = await supabase.from("owner_misc_charges").insert({
      organization_id: orgId,
      owner_id: input.ownerId,
      cattle_group_id: input.cattleGroupId || null,
      charge_date: input.chargeDate || new Date().toISOString().slice(0, 10),
      description,
      amount,
      notes: input.notes?.trim() || null,
    });
    if (error) return { error: formatDbError(error.message) };
    revalidatePath("/invoices");
    revalidateOwners();
    return { success: "Misc charge logged" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveOwnerMiscCharge(
  orgId: string,
  chargeId: string,
): Promise<OwnerActionState> {
  try {
    const supabase = await requireManager(orgId);
    const { error } = await supabase
      .from("owner_misc_charges")
      .update({ is_active: false })
      .eq("id", chargeId)
      .eq("organization_id", orgId);
    if (error) return { error: formatDbError(error.message) };
    revalidateOwners();
    return { success: "Misc charge removed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
