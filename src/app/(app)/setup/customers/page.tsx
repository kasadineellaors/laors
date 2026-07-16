import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { listCustomers } from "@/lib/customers/queries";
import { isInvoiceEmailConfigured } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/auth/app-url";
import { listCustomerPortalAccess } from "@/lib/portal/access";
import { CustomersClient } from "@/components/setup/customers-client";

export default async function CustomersSetupPage() {
  const session = await requireOnboardedUser();
  if (!canManageInvoices(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const [customers, portalAccess, appUrl] = await Promise.all([
    listCustomers(orgId),
    listCustomerPortalAccess(orgId),
    getAppUrl(),
  ]);

  const portalUrls = Object.fromEntries(
    Object.entries(portalAccess).map(([customerId, access]) => [
      customerId,
      `${appUrl}/portal/${access.portal_token}`,
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Customers</h1>
        <p className="text-charcoal/70">
          Yardage rates, portal links, and medicine markup for custom feeding and invoicing
        </p>
      </div>
      <CustomersClient
        orgId={orgId}
        customers={customers}
        portalUrls={portalUrls}
        emailConfigured={isInvoiceEmailConfigured()}
      />
    </div>
  );
}
