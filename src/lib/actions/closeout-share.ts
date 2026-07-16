"use server";

import { getAppUrl } from "@/lib/auth/app-url";
import { getCustomer } from "@/lib/customers/queries";
import { isValidEmail, normalizeEmail } from "@/lib/email/validate";
import { isInvoiceEmailConfigured, sendEmail } from "@/lib/email/resend";
import { closeoutPdfBase64 } from "@/lib/lots/closeout-pdf";
import { getLotCloseoutPrintData } from "@/lib/lots/closeout-report";
import {
  ensureCloseoutShare,
  markCloseoutShareEmailed,
} from "@/lib/lots/closeout-share";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sanitizeFilename } from "@/lib/auth/guards";

type ActionState = { success?: string; error?: string; shareUrl?: string };

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

  if (!member) throw new Error("Not authorized for this ranch");
  return { supabase, user };
}

export async function createCloseoutShareLink(
  orgId: string,
  groupId: string,
): Promise<ActionState> {
  try {
    const { user } = await requireOrgAccess(orgId);
    const share = await ensureCloseoutShare(orgId, groupId, user.id);
    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl}/share/closeout/${share.share_token}`;
    revalidatePath(`/cattle/groups/${groupId}/closeout`);
    return { success: "Share link ready", shareUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create share link" };
  }
}

export async function sendCloseoutToCustomer(
  orgId: string,
  groupId: string,
  emailOverride?: string,
): Promise<ActionState> {
  if (!isInvoiceEmailConfigured()) {
    return {
      error:
        "Email is not configured. Add RESEND_API_KEY and INVOICE_FROM_EMAIL to your environment, then retry.",
    };
  }

  try {
    const { user } = await requireOrgAccess(orgId);
    const printData = await getLotCloseoutPrintData(orgId, groupId);
    if (!printData) return { error: "Lot not found" };

    const supabase = await createClient();
    const { data: group } = await supabase
      .from("cattle_groups")
      .select("customer_id")
      .eq("id", groupId)
      .eq("organization_id", orgId)
      .maybeSingle();

    let recipientEmail = emailOverride?.trim() || "";
    if (!recipientEmail && group?.customer_id) {
      const customer = await getCustomer(orgId, group.customer_id);
      recipientEmail = customer?.email?.trim() || "";
    }

    if (!recipientEmail) {
      return {
        error:
          "No customer email on this lot. Add an email on the billing customer in Customers, or enter one below.",
      };
    }

    const normalized = normalizeEmail(recipientEmail);
    if (!isValidEmail(normalized)) {
      return { error: "Customer email is not valid" };
    }

    const share = await ensureCloseoutShare(orgId, groupId, user.id);
    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl}/share/closeout/${share.share_token}`;
    const filename = sanitizeFilename(`${printData.lotLabel}-closeout.pdf`, "lot-closeout.pdf");
    const netLabel = printData.netProfit >= 0 ? "Net profit" : "Net loss";
    const netValue = printData.netProfit.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });

    const result = await sendEmail({
      to: normalized,
      subject: `Lot closeout — ${printData.lotLabel} from ${printData.orgName}`,
      html: `
        <p>Hello,</p>
        <p>Please find the closeout report for lot <strong>${printData.lotLabel}</strong> from <strong>${printData.orgName}</strong>.</p>
        <p>${netLabel}: <strong>${netValue}</strong></p>
        <p>You can also view the report online:</p>
        <p><a href="${shareUrl}">${shareUrl}</a></p>
        <p>Thank you.</p>
      `.trim(),
      attachments: [
        {
          filename,
          content: closeoutPdfBase64(printData),
        },
      ],
    });

    if (!result.ok) return { error: result.error };

    await markCloseoutShareEmailed(orgId, groupId, normalized);
    revalidatePath(`/cattle/groups/${groupId}/closeout`);
    return { success: `Closeout emailed to ${normalized}`, shareUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send closeout" };
  }
}
