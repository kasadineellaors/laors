"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./onboarding";

export type DictionaryTable =
  | "movement_reasons"
  | "adjustment_reasons"
  | "task_categories"
  | "financial_categories";

async function requireOrgAccess(orgId: string) {
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

function revalidateSetup() {
  revalidatePath("/setup");
  revalidatePath("/setup/location-types");
  revalidatePath("/setup/classifications");
  revalidatePath("/setup/locations");
  revalidatePath("/setup/dictionary");
  revalidatePath("/onboarding");
}

export async function createLocationType(
  orgId: string,
  name: string,
  tier: "property" | "location",
  pluralName?: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase.from("location_types").insert({
      organization_id: orgId,
      name: name.trim(),
      plural_name: pluralName?.trim() || `${name.trim()}s`,
      tier,
    });
    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Location type created" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateLocationType(
  orgId: string,
  id: string,
  name: string,
  pluralName?: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase
      .from("location_types")
      .update({
        name: name.trim(),
        plural_name: pluralName?.trim() || `${name.trim()}s`,
      })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Location type updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveLocationType(orgId: string, id: string): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);

    const { count } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("location_type_id", id)
      .eq("is_active", true);

    if (count && count > 0) {
      return { error: "Remove or reassign locations using this type before archiving" };
    }

    const { error } = await supabase
      .from("location_types")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Location type archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createClassification(
  orgId: string,
  name: string,
  shortCode?: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase.from("cattle_classifications").insert({
      organization_id: orgId,
      name: name.trim(),
      short_code: shortCode?.trim() || null,
    });
    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Classification created" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateClassification(
  orgId: string,
  id: string,
  name: string,
  shortCode?: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase
      .from("cattle_classifications")
      .update({
        name: name.trim(),
        short_code: shortCode?.trim() || null,
      })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Classification updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveClassification(orgId: string, id: string): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);

    const { count } = await supabase
      .from("group_inventory_counts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("classification_id", id)
      .gt("head_count", 0);

    if (count && count > 0) {
      return { error: "Zero out inventory counts for this classification before archiving" };
    }

    const { error } = await supabase
      .from("cattle_classifications")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Classification archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateLocation(
  orgId: string,
  locationId: string,
  data: {
    name: string;
    acres?: number | null;
    capacityHead?: number | null;
    notes?: string | null;
  },
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase
      .from("locations")
      .update({
        name: data.name.trim(),
        acres: data.acres ?? null,
        capacity_head: data.capacityHead ?? null,
        notes: data.notes?.trim() || null,
      })
      .eq("id", locationId)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Location updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveLocation(
  orgId: string,
  locationId: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);

    const { count } = await supabase
      .from("cattle_groups")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("is_active", true);

    if (count && count > 0) {
      return { error: "Move cattle groups before deactivating this location" };
    }

    const { count: childCount } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", locationId)
      .eq("is_active", true);

    if (childCount && childCount > 0) {
      return { error: "Archive or move sub-locations first" };
    }

    const { error } = await supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", locationId)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Location archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateDictionaryEntry(
  orgId: string,
  table: DictionaryTable,
  id: string,
  name: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase
      .from(table)
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveDictionaryEntry(
  orgId: string,
  table: DictionaryTable,
  id: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase
      .from(table)
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createDictionaryEntry(
  orgId: string,
  table: DictionaryTable,
  name: string,
  categoryType?: "income" | "expense" | "cost_of_goods",
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);

    if (table === "financial_categories") {
      const { error } = await supabase.from("financial_categories").insert({
        organization_id: orgId,
        name: name.trim(),
        category_type: categoryType ?? "expense",
      });
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from(table).insert({
        organization_id: orgId,
        name: name.trim(),
      });
      if (error) return { error: error.message };
    }

    revalidateSetup();
    return { success: "Added" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createOwnershipGroup(
  orgId: string,
  name: string,
  ownershipType?: string,
  contactName?: string,
  phone?: string,
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase.from("ownership_groups").insert({
      organization_id: orgId,
      name: name.trim(),
      ownership_type: ownershipType?.trim() || null,
      contact_name: contactName?.trim() || null,
      phone: phone?.trim() || null,
    });
    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Ownership group created" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateOwnershipGroup(
  orgId: string,
  id: string,
  data: {
    name: string;
    ownershipType?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    notes?: string;
  },
): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { error } = await supabase
      .from("ownership_groups")
      .update({
        name: data.name.trim(),
        ownership_type: data.ownershipType?.trim() || null,
        contact_name: data.contactName?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveOwnershipGroup(orgId: string, id: string): Promise<ActionState> {
  try {
    const supabase = await requireOrgAccess(orgId);
    const { count } = await supabase
      .from("cattle_groups")
      .select("id", { count: "exact", head: true })
      .eq("ownership_group_id", id)
      .eq("is_active", true);
    if (count && count > 0) {
      return { error: "Reassign cattle groups before archiving this owner" };
    }
    const { error } = await supabase
      .from("ownership_groups")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
    revalidateSetup();
    return { success: "Archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
