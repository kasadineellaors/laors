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

export async function getCustomerPortalAccess(
  orgId: string,
  customerId: string,
): Promise<CustomerPortalAccess | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_portal_access")
    .select("portal_token, last_emailed_at")
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

export async function listCustomerPortalAccess(
  orgId: string,
): Promise<Record<string, CustomerPortalAccess>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_portal_access")
    .select("customer_id, portal_token, last_emailed_at")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const map: Record<string, CustomerPortalAccess> = {};
  for (const row of data ?? []) {
    map[row.customer_id] = {
      portal_token: row.portal_token,
      last_emailed_at: row.last_emailed_at,
    };
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
    .from("customer_portal_access")
    .insert({
      organization_id: orgId,
      customer_id: customerId,
      portal_token: portalToken,
    })
    .select("portal_token, last_emailed_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create customer portal link");
  }

  return data;
}

export async function resolveCustomerPortalByToken(
  token: string,
): Promise<ResolvedCustomerPortal | null> {
  const admin = createAdminClient();
  if (!admin) return null;

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
  await supabase
    .from("customer_portal_access")
    .update({ last_emailed_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .eq("is_active", true);
}
