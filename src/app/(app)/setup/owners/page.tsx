import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { getOwnerGroupMembers, listOwners } from "@/lib/owners/queries";
import { isInvoiceEmailConfigured } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/auth/app-url";
import { listCustomerPortalAccess } from "@/lib/portal/access";
import { OwnersClient } from "@/components/setup/owners-client";

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
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Owners</h1>
        <p className="text-charcoal/70">
          Billing rates, ownership groups with split %, misc charges, and portal links
        </p>
      </div>
      <OwnersClient
        orgId={orgId}
        owners={owners}
        groupMembers={groupMembers}
        portalUrls={portalUrls}
        emailConfigured={isInvoiceEmailConfigured()}
      />
    </div>
  );
}
