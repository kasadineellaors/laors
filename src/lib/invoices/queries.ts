import { createClient } from "@/lib/supabase/server";
import type { InvoiceLineRecord, InvoiceRecord, InvoiceStatus, InvoiceSummary } from "./types";
import type { InvoiceOrgInfo, InvoicePrintData } from "./print-types";

export async function listInvoices(orgId: string, limit = 50): Promise<InvoiceRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];
  return enrichInvoices(orgId, rows);
}

export async function getInvoicePrintData(orgId: string, id: string): Promise<InvoicePrintData | null> {
  const invoice = await getInvoice(orgId, id);
  if (!invoice) return null;

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, address_line1, address_line2, city, state, zip, phone")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return null;

  const orgInfo: InvoiceOrgInfo = {
    name: org.name,
    addressLine1: org.address_line1,
    addressLine2: org.address_line2,
    city: org.city,
    state: org.state,
    zip: org.zip,
    phone: org.phone,
  };

  return { invoice, org: orgInfo };
}

export async function getInvoice(orgId: string, id: string): Promise<InvoiceRecord | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return null;
  const [enriched] = await enrichInvoices(orgId, [row]);
  return enriched ?? null;
}

export async function getInvoiceSummary(orgId: string): Promise<InvoiceSummary> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("invoices")
    .select("subtotal, status")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("status", ["draft", "sent"]);

  const openCount = rows?.length ?? 0;
  const unpaidTotal = (rows ?? []).reduce((s, r) => s + Number(r.subtotal), 0);

  return {
    openCount,
    unpaidTotal: Math.round(unpaidTotal * 100) / 100,
  };
}

async function enrichInvoices(
  orgId: string,
  rows: Array<Record<string, unknown>>,
): Promise<InvoiceRecord[]> {
  const supabase = await createClient();
  const invoiceIds = rows.map((r) => r.id as string);
  const profileIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];

  const [{ data: lines }, { data: profiles }] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("*")
      .eq("organization_id", orgId)
      .in("invoice_id", invoiceIds)
      .order("sort_order"),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileNames = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  const linesByInvoice = new Map<string, InvoiceLineRecord[]>();
  for (const line of lines ?? []) {
    const list = linesByInvoice.get(line.invoice_id) ?? [];
    list.push({
      id: line.id,
      description: line.description,
      quantity: Number(line.quantity),
      unit_price: Number(line.unit_price),
      line_total: Number(line.line_total),
      sort_order: line.sort_order,
    });
    linesByInvoice.set(line.invoice_id, list);
  }

  return rows.map((r) => ({
    id: r.id as string,
    invoice_number: r.invoice_number as string,
    customer_name: r.customer_name as string,
    customer_email: (r.customer_email as string | null) ?? null,
    customer_address: (r.customer_address as string | null) ?? null,
    customer_id: (r.customer_id as string | null) ?? null,
    invoice_date: r.invoice_date as string,
    due_date: (r.due_date as string | null) ?? null,
    status: r.status as InvoiceStatus,
    subtotal: Number(r.subtotal),
    notes: (r.notes as string | null) ?? null,
    sales_record_id: (r.sales_record_id as string | null) ?? null,
    created_by_name: r.created_by ? profileNames.get(r.created_by as string) ?? null : null,
    lines: linesByInvoice.get(r.id as string) ?? [],
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}
