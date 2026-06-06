"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type { InvoiceLineInput, InvoiceStatus } from "@/lib/invoices/types";
import { buildBillingPreview } from "@/lib/invoices/billing";
import { getCustomer } from "@/lib/customers/queries";
import { getSale } from "@/lib/sales/queries";

type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];

export type InvoiceActionState = {
  error?: string;
  success?: string;
  invoiceId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE5.sql (and RUN_PHASE7.sql for billing) in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (
    message.includes("invoices") ||
    message.includes("invoice_lines") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateInvoices() {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
}

async function requireInvoiceWriter(orgId: string) {
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
    throw new Error("Not authorized — managers and accountants only");
  }
  return { supabase, user };
}

function computeLineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

function normalizeLines(lines: InvoiceLineInput[]) {
  return lines
    .filter((l) => l.description.trim())
    .map((l, i) => {
      const quantity = l.quantity > 0 ? l.quantity : 1;
      const unitPrice = l.unitPrice >= 0 ? l.unitPrice : 0;
      return {
        description: l.description.trim(),
        quantity,
        unit_price: unitPrice,
        line_total: computeLineTotal(quantity, unitPrice),
        sort_order: i,
      };
    });
}

async function nextInvoiceNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .like("invoice_number", `${prefix}%`);

  const seq = (count ?? 0) + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

async function replaceInvoiceLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  invoiceId: string,
  lines: ReturnType<typeof normalizeLines>,
) {
  await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceId);

  if (lines.length === 0) return;

  const { error } = await supabase.from("invoice_lines").insert(
    lines.map((l) => ({
      organization_id: orgId,
      invoice_id: invoiceId,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      line_total: l.line_total,
      sort_order: l.sort_order,
    })),
  );

  if (error) throw new Error(error.message);
}

export async function createInvoice(
  orgId: string,
  input: {
    customerId?: string;
    customerName: string;
    customerEmail?: string;
    customerAddress?: string;
    invoiceDate?: string;
    dueDate?: string;
    status?: InvoiceStatus;
    notes?: string;
    salesRecordId?: string;
    lines: InvoiceLineInput[];
  },
): Promise<InvoiceActionState> {
  const customerName = input.customerName.trim();
  if (!customerName) return { error: "Customer name is required" };

  const lines = normalizeLines(input.lines);
  if (lines.length === 0) return { error: "Add at least one line item" };

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);

  try {
    const { supabase, user } = await requireInvoiceWriter(orgId);
    const invoiceNumber = await nextInvoiceNumber(supabase, orgId);

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        organization_id: orgId,
        invoice_number: invoiceNumber,
        customer_name: customerName,
        customer_email: input.customerEmail?.trim() || null,
        customer_address: input.customerAddress?.trim() || null,
        customer_id: input.customerId || null,
        invoice_date: input.invoiceDate || new Date().toISOString().slice(0, 10),
        due_date: input.dueDate || null,
        status: input.status ?? "draft",
        subtotal,
        sales_record_id: input.salesRecordId || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };

    await replaceInvoiceLines(supabase, orgId, data.id, lines);
    revalidateInvoices();
    return { success: "Invoice created", invoiceId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function previewBillingInvoice(
  orgId: string,
  input: { customerId: string; periodStart: string; periodEnd: string },
) {
  try {
    await requireInvoiceWriter(orgId);
    const result = await buildBillingPreview(
      orgId,
      input.customerId,
      input.periodStart,
      input.periodEnd,
    );
    if ("error" in result) return { error: result.error };
    return { preview: result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createInvoiceFromBilling(
  orgId: string,
  input: { customerId: string; periodStart: string; periodEnd: string },
): Promise<InvoiceActionState> {
  const previewResult = await buildBillingPreview(
    orgId,
    input.customerId,
    input.periodStart,
    input.periodEnd,
  );
  if ("error" in previewResult) return { error: previewResult.error };
  if (previewResult.lines.length === 0) {
    return { error: "No billable lines — check customer rates, linked groups, and treatments." };
  }

  const lines: InvoiceLineInput[] = previewResult.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
  }));

  const result = await createInvoice(orgId, {
    customerId: previewResult.customerId,
    customerName: previewResult.customerName,
    customerEmail: previewResult.customerEmail ?? undefined,
    customerAddress: previewResult.customerAddress ?? undefined,
    invoiceDate: input.periodEnd,
    notes: `Billing period ${input.periodStart} through ${input.periodEnd}`,
    lines,
  });

  if (result.invoiceId && previewResult.treatmentIds.length > 0) {
    try {
      const { supabase } = await requireInvoiceWriter(orgId);
      await supabase
        .from("treatment_records")
        .update({
          invoiced_at: new Date().toISOString(),
          invoice_id: result.invoiceId,
        })
        .eq("organization_id", orgId)
        .in("id", previewResult.treatmentIds);
    } catch {
      // invoice created; treatment flags optional until RUN_SHIP.sql applied
    }
  }

  return result;
}

export async function createInvoiceFromSale(
  orgId: string,
  saleId: string,
): Promise<InvoiceActionState> {
  const sale = await getSale(orgId, saleId);
  if (!sale) return { error: "Sale not found" };

  const description = `${sale.head_count} head cattle${sale.cattle_group_name ? ` — ${sale.cattle_group_name}` : ""}`;
  const total = sale.total_amount ?? 0;
  const perHead = sale.price_per_head ?? (sale.head_count > 0 ? total / sale.head_count : 0);

  let customerId = sale.customer_id ?? undefined;
  let customerName = sale.buyer_name || "Customer";
  let customerEmail: string | undefined;
  let customerAddress: string | undefined;

  if (customerId) {
    const customer = await getCustomer(orgId, customerId);
    if (customer) {
      customerName = customer.name;
      customerEmail = customer.email ?? undefined;
      customerAddress = customer.address ?? undefined;
    }
  }

  return createInvoice(orgId, {
    customerId,
    customerName,
    customerEmail,
    customerAddress,
    invoiceDate: sale.sale_date,
    salesRecordId: saleId,
    lines: [
      {
        description,
        quantity: sale.head_count,
        unitPrice: perHead,
      },
    ],
    notes: sale.notes ?? undefined,
  });
}

export async function updateInvoice(
  orgId: string,
  invoiceId: string,
  input: {
    customerId?: string | null;
    customerName?: string;
    customerEmail?: string | null;
    customerAddress?: string | null;
    invoiceDate?: string;
    dueDate?: string | null;
    status?: InvoiceStatus;
    notes?: string | null;
    lines?: InvoiceLineInput[];
  },
): Promise<InvoiceActionState> {
  try {
    const { supabase } = await requireInvoiceWriter(orgId);

    const updates: InvoiceUpdate = {};
    if (input.customerId !== undefined) updates.customer_id = input.customerId;
    if (input.customerName !== undefined) updates.customer_name = input.customerName.trim();
    if (input.customerEmail !== undefined) updates.customer_email = input.customerEmail?.trim() || null;
    if (input.customerAddress !== undefined) {
      updates.customer_address = input.customerAddress?.trim() || null;
    }
    if (input.invoiceDate !== undefined) updates.invoice_date = input.invoiceDate;
    if (input.dueDate !== undefined) updates.due_date = input.dueDate;
    if (input.status !== undefined) updates.status = input.status;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    if (input.lines) {
      const lines = normalizeLines(input.lines);
      if (lines.length === 0) return { error: "Add at least one line item" };
      updates.subtotal = lines.reduce((s, l) => s + l.line_total, 0);
      await replaceInvoiceLines(supabase, orgId, invoiceId, lines);
    }

    const { error } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", invoiceId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateInvoices();
    revalidatePath(`/invoices/${invoiceId}`);
    return { success: "Invoice updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateInvoiceStatus(
  orgId: string,
  invoiceId: string,
  status: InvoiceStatus,
): Promise<InvoiceActionState> {
  return updateInvoice(orgId, invoiceId, { status });
}

export async function archiveInvoice(orgId: string, invoiceId: string): Promise<InvoiceActionState> {
  try {
    const { supabase } = await requireInvoiceWriter(orgId);
    const { error } = await supabase
      .from("invoices")
      .update({ is_active: false, status: "cancelled" })
      .eq("id", invoiceId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateInvoices();
    return { success: "Invoice archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
