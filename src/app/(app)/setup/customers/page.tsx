import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { listCustomers } from "@/lib/customers/queries";
import { CustomersClient } from "@/components/setup/customers-client";

export default async function CustomersSetupPage() {
  const session = await requireOnboardedUser();
  if (!canManageInvoices(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const customers = await listCustomers(orgId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Customers</h1>
        <p className="text-charcoal/70">
          Yardage rates and medicine markup for custom feeding and invoicing
        </p>
      </div>
      <CustomersClient orgId={orgId} customers={customers} />
    </div>
  );
}
