import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CustomerPortalAccess = {
  portal_token: string;
  last_emailed_at: string | null;
};

export type ResolvedCustomerPortal = {
  organization_id: string;
  customer_id: string;
  portal_token: string;
};

function generatePortalToken(): string {
  return randomBytes(24).toString("base64url");
}

async function readOwnerPortalRow(orgId: string, ownerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("owner_portal_access")
    .select("portal_token, last_emailed_at")
    .eq("organization_id", orgId)
    .eq("owner_id", ownerId)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

async function readLegacyCustomerPortalRow(orgId: string, ownerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_portal_access")
    .select("portal_token, last_emailed_at")
    .eq("organization_id", orgId)
    .eq("customer_id", ownerId)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function getCustomerPortalAccess(
  orgId: string,
  customerId: string,
): Promise<CustomerPortalAccess | null> {
  const ownerRow = await readOwnerPortalRow(orgId, customerId);
  if (ownerRow) return ownerRow;
  return readLegacyCustomerPortalRow(orgId, customerId);
}

export async function listCustomerPortalAccess(
  orgId: string,
): Promise<Record<string, CustomerPortalAccess>> {
  const supabase = await createClient();
  const map: Record<string, CustomerPortalAccess> = {};

  const { data: ownerRows } = await supabase
    .from("owner_portal_access")
    .select("owner_id, portal_token, last_emailed_at")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  for (const row of ownerRows ?? []) {
    map[row.owner_id] = {
      portal_token: row.portal_token,
      last_emailed_at: row.last_emailed_at,
    };
  }

  const { data: legacyRows } = await supabase
    .from("customer_portal_access")
    .select("customer_id, portal_token, last_emailed_at")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  for (const row of legacyRows ?? []) {
    if (!map[row.customer_id]) {
      map[row.customer_id] = {
        portal_token: row.portal_token,
        last_emailed_at: row.last_emailed_at,
      };
    }
  }

  return map;
}

export async function ensureCustomerPortalAccess(
  orgId: string,
  customerId: string,
): Promise<CustomerPortalAccess> {
  const existing = await getCustomerPortalAccess(orgId, customerId);
  if (existing) return existing;

  const supabase = await createClient();
  const portalToken = generatePortalToken();

  const { data, error } = await supabase
    .from("owner_portal_access")
    .insert({
      organization_id: orgId,
      owner_id: customerId,
      portal_token: portalToken,
    })
    .select("portal_token, last_emailed_at")
    .single();

  if (!error && data) return data;

  const legacy = await supabase
    .from("customer_portal_access")
    .insert({
      organization_id: orgId,
      customer_id: customerId,
      portal_token: portalToken,
    })
    .select("portal_token, last_emailed_at")
    .single();

  if (legacy.error || !legacy.data) {
    throw new Error(legacy.error?.message ?? error?.message ?? "Failed to create portal link");
  }

  return legacy.data;
}

export async function resolveCustomerPortalByToken(
  token: string,
): Promise<ResolvedCustomerPortal | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: ownerRow } = await admin
    .from("owner_portal_access")
    .select("organization_id, owner_id, portal_token")
    .eq("portal_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (ownerRow) {
    return {
      organization_id: ownerRow.organization_id,
      customer_id: ownerRow.owner_id,
      portal_token: ownerRow.portal_token,
    };
  }

  const { data } = await admin
    .from("customer_portal_access")
    .select("organization_id, customer_id, portal_token")
    .eq("portal_token", token)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

export async function markCustomerPortalEmailed(orgId: string, customerId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("owner_portal_access")
    .update({ last_emailed_at: now })
    .eq("organization_id", orgId)
    .eq("owner_id", customerId)
    .eq("is_active", true);
  await supabase
    .from("customer_portal_access")
    .update({ last_emailed_at: now })
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .eq("is_active", true);
}
