import { randomBytes } from "crypto";
import { LOT_STATUS_LABELS, type LotStatus } from "@/lib/lots/types";
import type { BillingCategory, BillingSnapshot, InvoiceStatus } from "@/lib/invoices/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerPortalLot = {
  id: string;
  label: string;
  status: string;
  status_label: string;
  head: number;
  location_label: string | null;
  closeout_token: string | null;
};

export type CustomerPortalInvoiceLine = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  category: BillingCategory | null;
};

export type CustomerPortalInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: InvoiceStatus;
  subtotal: number;
  notes: string | null;
  lines: CustomerPortalInvoiceLine[];
  billing_snapshot: BillingSnapshot | null;
};

export type CustomerPortalData = {
  org_name: string;
  owner_name: string;
  lots: CustomerPortalLot[];
  invoices: CustomerPortalInvoice[];
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export { money as formatPortalMoney };

function parseBillingSnapshot(raw: unknown): BillingSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as BillingSnapshot;
  return snap.version === 1 ? snap : null;
}

async function resolveOwnerName(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  orgId: string,
  ownerId: string,
): Promise<string | null> {
  const { data: owner } = await admin
    .from("owners")
    .select("name")
    .eq("id", ownerId)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .maybeSingle();

  if (owner?.name) return owner.name;

  const { data: customer } = await admin
    .from("customers")
    .select("name")
    .eq("id", ownerId)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .maybeSingle();

  return customer?.name ?? null;
}

export async function getCustomerPortalData(
  orgId: string,
  ownerId: string,
): Promise<CustomerPortalData | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const [ownerName, { data: org }] = await Promise.all([
    resolveOwnerName(admin, orgId, ownerId),
    admin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
  ]);

  if (!ownerName || !org) return null;

  const { data: groups } = await admin
    .from("cattle_groups")
    .select("id, name, lot_number, lot_status, starting_head, location_id, owner_id, customer_id")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .or(`owner_id.eq.${ownerId},customer_id.eq.${ownerId}`)
    .order("opened_at", { ascending: false });

  const { data: invoiceRows } = await admin
    .from("invoices")
    .select("id, invoice_number, invoice_date, status, subtotal, notes, billing_snapshot")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .or(`owner_id.eq.${ownerId},customer_id.eq.${ownerId}`)
    .order("invoice_date", { ascending: false })
    .limit(25);

  const invoiceIds = (invoiceRows ?? []).map((i) => i.id);
  const { data: lineRows } = invoiceIds.length
    ? await admin
        .from("invoice_lines")
        .select("invoice_id, description, quantity, unit_price, line_total, category, sort_order")
        .eq("organization_id", orgId)
        .in("invoice_id", invoiceIds)
        .order("sort_order")
    : { data: [] };

  const linesByInvoice = new Map<string, CustomerPortalInvoiceLine[]>();
  for (const line of lineRows ?? []) {
    const list = linesByInvoice.get(line.invoice_id) ?? [];
    list.push({
      description: line.description,
      quantity: Number(line.quantity),
      unit_price: Number(line.unit_price),
      line_total: Number(line.line_total),
      category: (line.category as BillingCategory | null) ?? null,
    });
    linesByInvoice.set(line.invoice_id, list);
  }

  const groupIds = (groups ?? []).map((g) => g.id);
  const locationIds = [
    ...new Set((groups ?? []).map((g) => g.location_id).filter(Boolean)),
  ] as string[];

  const [{ data: shares }, { data: countRows }, { data: locations }] = await Promise.all([
    groupIds.length
      ? admin
          .from("lot_closeout_shares")
          .select("cattle_group_id, share_token")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .in("cattle_group_id", groupIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? admin
          .from("group_inventory_counts")
          .select("cattle_group_id, head_count")
          .eq("organization_id", orgId)
          .in("cattle_group_id", groupIds)
      : { data: [] },
    locationIds.length
      ? admin.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const shareByGroup = new Map((shares ?? []).map((s) => [s.cattle_group_id, s.share_token]));
  const locName = new Map((locations ?? []).map((l) => [l.id, l.name]));

  const headByGroup = new Map<string, number>();
  for (const row of countRows ?? []) {
    headByGroup.set(
      row.cattle_group_id,
      (headByGroup.get(row.cattle_group_id) ?? 0) + row.head_count,
    );
  }

  const lots: CustomerPortalLot[] = [];
  for (const group of groups ?? []) {
    const status = group.lot_status as LotStatus;
    let closeoutToken = shareByGroup.get(group.id) ?? null;

    if (status === "closed" && !closeoutToken) {
      const token = randomBytes(24).toString("base64url");
      const { data: created } = await admin
        .from("lot_closeout_shares")
        .insert({
          organization_id: orgId,
          cattle_group_id: group.id,
          share_token: token,
        })
        .select("share_token")
        .maybeSingle();
      if (created?.share_token) {
        closeoutToken = created.share_token;
      } else {
        const { data: existing } = await admin
          .from("lot_closeout_shares")
          .select("share_token")
          .eq("cattle_group_id", group.id)
          .eq("is_active", true)
          .maybeSingle();
        closeoutToken = existing?.share_token ?? null;
      }
    }

    lots.push({
      id: group.id,
      label: group.lot_number || group.name,
      status,
      status_label: LOT_STATUS_LABELS[status] ?? status,
      head: headByGroup.get(group.id) ?? group.starting_head ?? 0,
      location_label: group.location_id ? locName.get(group.location_id) ?? null : null,
      closeout_token: closeoutToken,
    });
  }

  return {
    org_name: org.name,
    owner_name: ownerName,
    lots,
    invoices: (invoiceRows ?? []).map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      status: inv.status as InvoiceStatus,
      subtotal: Number(inv.subtotal),
      notes: inv.notes,
      lines: linesByInvoice.get(inv.id) ?? [],
      billing_snapshot: parseBillingSnapshot(inv.billing_snapshot),
    })),
  };
}
