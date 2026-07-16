import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { getOwnerGroupMembers, listOwners } from "@/lib/owners/queries";
import { isInvoiceEmailConfigured } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/auth/app-url";
import { listCustomerPortalAccess } from "@/lib/portal/access";
import { OwnersClient } from "@/components/setup/owners-client";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Owners & Clients — LAORS",
};

export default async function OwnersSetupPage() {
  const session = await requireOnboardedUser();
  if (!canManageInvoices(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const [owners, portalAccess, appUrl] = await Promise.all([
    listOwners(orgId),
    listCustomerPortalAccess(orgId),
    getAppUrl(),
  ]);

  const groupMembers: Record<string, Awaited<ReturnType<typeof getOwnerGroupMembers>>> = {};
  for (const owner of owners.filter((o) => o.is_ownership_group)) {
    groupMembers[owner.id] = await getOwnerGroupMembers(orgId, owner.id);
  }

  const portalUrls = Object.fromEntries(
    Object.entries(portalAccess).map(([ownerId, access]) => [
      ownerId,
      `${appUrl}/portal/${access.portal_token}`,
    ]),
  );

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Owners & Clients"
        subtitle="Manage cattle ownership, billing rates, charges, and client access."
      />
      <OwnersClient
        orgId={orgId}
        owners={owners}
        groupMembers={groupMembers}
        portalUrls={portalUrls}
        emailConfigured={isInvoiceEmailConfigured()}
      />
    </ManageSubpageShell>
  );
}
