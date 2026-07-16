import { createClient } from "@/lib/supabase/server";
import type { OwnerGroupMember, OwnerMiscCharge, OwnerOption, OwnerRecord } from "./types";

function mapOwner(row: Record<string, unknown>): OwnerRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
    ownership_type: (row.ownership_type as string | null) ?? null,
    is_ownership_group: Boolean(row.is_ownership_group),
    yardage_rate_per_head_day:
      row.yardage_rate_per_head_day != null ? Number(row.yardage_rate_per_head_day) : null,
    medicine_markup_percent:
      row.medicine_markup_percent != null ? Number(row.medicine_markup_percent) : null,
    feed_markup_percent:
      row.feed_markup_percent != null ? Number(row.feed_markup_percent) : null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function ownersTable(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("owners")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOwner);
}

/** Fallback to legacy customers table before Phase 33 SQL is applied. */
async function legacyCustomersTable(orgId: string): Promise<OwnerRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");
  if (error) return [];
  return (data ?? []).map((row) =>
    mapOwner({
      ...row,
      contact_name: null,
      ownership_type: null,
      is_ownership_group: false,
    }),
  );
}

export async function listOwners(orgId: string): Promise<OwnerRecord[]> {
  try {
    return await ownersTable(orgId);
  } catch {
    return legacyCustomersTable(orgId);
  }
}

export async function listBillableOwners(orgId: string): Promise<OwnerRecord[]> {
  const owners = await listOwners(orgId);
  return owners.filter((o) => !o.is_ownership_group);
}

export async function getOwner(orgId: string, ownerId: string): Promise<OwnerRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("owners")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", ownerId)
    .maybeSingle();
  if (!error && data) return mapOwner(data);

  const { data: legacy } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", ownerId)
    .maybeSingle();
  if (!legacy) return null;
  return mapOwner({
    ...legacy,
    contact_name: null,
    ownership_type: null,
    is_ownership_group: false,
  });
}

export async function listOwnerOptions(orgId: string): Promise<OwnerOption[]> {
  const owners = await listOwners(orgId);
  return owners.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    address: o.address,
    is_ownership_group: o.is_ownership_group,
    yardage_rate_per_head_day: o.yardage_rate_per_head_day,
    medicine_markup_percent: o.medicine_markup_percent,
    feed_markup_percent: o.feed_markup_percent,
  }));
}

export async function getOwnerGroupMembers(
  orgId: string,
  groupOwnerId: string,
): Promise<OwnerGroupMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("owner_group_members")
    .select("id, member_owner_id, percentage")
    .eq("organization_id", orgId)
    .eq("group_owner_id", groupOwnerId);
  if (error) return [];

  const memberIds = (data ?? []).map((row) => row.member_owner_id);
  const { data: memberOwners } = memberIds.length
    ? await supabase.from("owners").select("id, name").in("id", memberIds)
    : { data: [] };
  const names = new Map((memberOwners ?? []).map((o) => [o.id, o.name]));

  return (data ?? []).map((row) => ({
    id: row.id,
    member_owner_id: row.member_owner_id,
    member_name: names.get(row.member_owner_id) ?? "Owner",
    percentage: Number(row.percentage),
  }));
}

/** Groups where this owner is a member (for split billing). */
export async function getOwnerGroupMemberships(
  orgId: string,
  memberOwnerId: string,
): Promise<Array<{ group_owner_id: string; group_name: string; percentage: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("owner_group_members")
    .select("group_owner_id, percentage")
    .eq("organization_id", orgId)
    .eq("member_owner_id", memberOwnerId);
  if (error) return [];

  const groupIds = (data ?? []).map((row) => row.group_owner_id);
  const { data: groups } = groupIds.length
    ? await supabase.from("owners").select("id, name").in("id", groupIds)
    : { data: [] };
  const names = new Map((groups ?? []).map((g) => [g.id, g.name]));

  return (data ?? []).map((row) => ({
    group_owner_id: row.group_owner_id,
    group_name: names.get(row.group_owner_id) ?? "Group",
    percentage: Number(row.percentage),
  }));
}

export async function listOwnerMiscCharges(
  orgId: string,
  ownerId: string,
  options?: { uninvoicedOnly?: boolean; periodStart?: string; periodEnd?: string },
): Promise<OwnerMiscCharge[]> {
  const supabase = await createClient();
  let query = supabase
    .from("owner_misc_charges")
    .select("id, owner_id, cattle_group_id, charge_date, description, amount, invoiced_at, notes")
    .eq("organization_id", orgId)
    .eq("owner_id", ownerId)
    .eq("is_active", true)
    .order("charge_date", { ascending: false });

  if (options?.uninvoicedOnly) query = query.is("invoiced_at", null);
  if (options?.periodStart) query = query.gte("charge_date", options.periodStart);
  if (options?.periodEnd) query = query.lte("charge_date", options.periodEnd);

  const { data, error } = await query;
  if (error) return [];

  const groupIds = [...new Set((data ?? []).map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const { data: groups } = groupIds.length
    ? await supabase.from("cattle_groups").select("id, name").in("id", groupIds)
    : { data: [] };
  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));

  return (data ?? []).map((row) => ({
    id: row.id,
    owner_id: row.owner_id,
    cattle_group_id: row.cattle_group_id,
    cattle_group_name: row.cattle_group_id ? groupNames.get(row.cattle_group_id) ?? null : null,
    charge_date: row.charge_date,
    description: row.description,
    amount: Number(row.amount),
    invoiced_at: row.invoiced_at,
    notes: row.notes,
  }));
}
