import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { listCustomerOptions } from "@/lib/customers/queries";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const metadata: Metadata = {
  title: "New Invoice — LAORS",
};

export default async function NewInvoicePage() {
  const session = await requireOnboardedUser();
  if (!canManageInvoices(session.membership?.system_role)) {
    redirect("/invoices");
  }

  const orgId = session.organization!.id;
  const customerOptions = await listCustomerOptions(orgId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/invoices" className="text-sm font-medium text-olive hover:underline">
          ← Invoices
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">New invoice</h1>
      </div>
      <InvoiceForm orgId={orgId} customerOptions={customerOptions} />
    </div>
  );
}
