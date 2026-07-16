import { randomBytes } from "crypto";
import { LOT_STATUS_LABELS, type LotStatus } from "@/lib/lots/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceStatus } from "@/lib/invoices/types";

export type CustomerPortalLot = {
  id: string;
  label: string;
  status: string;
  status_label: string;
  head: number;
  closeout_token: string | null;
};

export type CustomerPortalInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: InvoiceStatus;
  subtotal: number;
};

export type CustomerPortalData = {
  org_name: string;
  customer_name: string;
  lots: CustomerPortalLot[];
  invoices: CustomerPortalInvoice[];
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export { money as formatPortalMoney };

export async function getCustomerPortalData(
  orgId: string,
  customerId: string,
): Promise<CustomerPortalData | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const [{ data: customer }, { data: org }, { data: groups }, { data: invoices }] =
    await Promise.all([
      admin
        .from("customers")
        .select("name")
        .eq("id", customerId)
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .maybeSingle(),
      admin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      admin
        .from("cattle_groups")
        .select("id, name, lot_number, lot_status, starting_head")
        .eq("organization_id", orgId)
        .eq("customer_id", customerId)
        .eq("is_active", true)
        .order("opened_at", { ascending: false }),
      admin
        .from("invoices")
        .select("id, invoice_number, invoice_date, status, subtotal")
        .eq("organization_id", orgId)
        .eq("customer_id", customerId)
        .eq("is_active", true)
        .order("invoice_date", { ascending: false })
        .limit(25),
    ]);

  if (!customer || !org) return null;

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: shares } = groupIds.length
    ? await admin
        .from("lot_closeout_shares")
        .select("cattle_group_id, share_token")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .in("cattle_group_id", groupIds)
    : { data: [] };

  const shareByGroup = new Map((shares ?? []).map((s) => [s.cattle_group_id, s.share_token]));

  const { data: countRows } = groupIds.length
    ? await admin
        .from("group_inventory_counts")
        .select("cattle_group_id, head_count")
        .eq("organization_id", orgId)
        .in("cattle_group_id", groupIds)
    : { data: [] };

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
      const { data: created, error } = await admin
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
      } else if (!error) {
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
      closeout_token: closeoutToken,
    });
  }

  return {
    org_name: org.name,
    customer_name: customer.name,
    lots,
    invoices: (invoices ?? []).map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      status: inv.status as InvoiceStatus,
      subtotal: Number(inv.subtotal),
    })),
  };
}
