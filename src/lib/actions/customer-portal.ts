"use server";

import { getAppUrl } from "@/lib/auth/app-url";
import { isValidEmail, normalizeEmail } from "@/lib/email/validate";
import { isInvoiceEmailConfigured, sendEmail } from "@/lib/email/resend";
import {
  ensureCustomerPortalAccess,
  markCustomerPortalEmailed,
} from "@/lib/portal/access";
import { getCustomer } from "@/lib/customers/queries";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionState = { success?: string; error?: string; portalUrl?: string };

async function requireFinanceAccess(orgId: string) {
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

  return { user };
}

export async function createCustomerPortalLink(
  orgId: string,
  customerId: string,
): Promise<ActionState> {
  try {
    await requireFinanceAccess(orgId);
    const access = await ensureCustomerPortalAccess(orgId, customerId);
    const appUrl = await getAppUrl();
    const portalUrl = `${appUrl}/portal/${access.portal_token}`;
    revalidatePath("/setup/customers");
    return { success: "Portal link ready", portalUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create portal link" };
  }
}

export async function sendCustomerPortalInvite(
  orgId: string,
  customerId: string,
  emailOverride?: string,
): Promise<ActionState> {
  if (!isInvoiceEmailConfigured()) {
    return {
      error:
        "Email is not configured. Add RESEND_API_KEY and INVOICE_FROM_EMAIL to your environment.",
    };
  }

  try {
    await requireFinanceAccess(orgId);
    const customer = await getCustomer(orgId, customerId);
    if (!customer) return { error: "Customer not found" };

    const recipient = emailOverride?.trim() || customer.email?.trim() || "";
    if (!recipient) {
      return { error: "Add a customer email first, or enter one below." };
    }

    const normalized = normalizeEmail(recipient);
    if (!isValidEmail(normalized)) {
      return { error: "Customer email is not valid" };
    }

    const access = await ensureCustomerPortalAccess(orgId, customerId);
    const appUrl = await getAppUrl();
    const portalUrl = `${appUrl}/portal/${access.portal_token}`;

    const supabase = await createClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();

    const orgName = org?.name ?? "LAORS Ranch";
    const result = await sendEmail({
      to: normalized,
      subject: `Your cattle portal — ${orgName}`,
      html: `
        <p>Hello${customer.name ? ` ${customer.name}` : ""},</p>
        <p><strong>${orgName}</strong> shared your customer portal where you can view your lots, closeout reports, and invoices.</p>
        <p><a href="${portalUrl}">${portalUrl}</a></p>
        <p>Thank you.</p>
      `.trim(),
    });

    if (!result.ok) return { error: result.error };

    await markCustomerPortalEmailed(orgId, customerId);
    revalidatePath("/setup/customers");
    return { success: `Portal link emailed to ${normalized}`, portalUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send portal invite" };
  }
}
