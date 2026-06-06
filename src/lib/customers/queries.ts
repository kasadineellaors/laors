import { createClient } from "@/lib/supabase/server";
import type { CustomerOption, CustomerRecord } from "./types";

function mapCustomer(row: Record<string, unknown>): CustomerRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    yardage_rate_per_head_day:
      row.yardage_rate_per_head_day != null
        ? Number(row.yardage_rate_per_head_day)
        : null,
    medicine_markup_percent:
      row.medicine_markup_percent != null ? Number(row.medicine_markup_percent) : null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listCustomers(orgId: string): Promise<CustomerRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (error || !rows?.length) return [];
  return rows.map(mapCustomer);
}

export async function listCustomerOptions(orgId: string): Promise<CustomerOption[]> {
  const customers = await listCustomers(orgId);
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    address: c.address,
    yardage_rate_per_head_day: c.yardage_rate_per_head_day,
    medicine_markup_percent: c.medicine_markup_percent,
  }));
}

export async function getCustomer(orgId: string, id: string): Promise<CustomerRecord | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  return row ? mapCustomer(row) : null;
}
