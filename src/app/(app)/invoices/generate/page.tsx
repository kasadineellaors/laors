import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { listCustomerOptions } from "@/lib/customers/queries";
import { GenerateInvoiceClient } from "@/components/invoices/generate-invoice-client";

export const metadata: Metadata = {
  title: "Generate Invoice — LAORS",
};

export default async function GenerateInvoicePage() {
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
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Generate invoice</h1>
        <p className="text-charcoal/70">
          Auto-build yardage and medicine lines from customer rates and ranch activity
        </p>
      </div>
      <GenerateInvoiceClient orgId={orgId} customerOptions={customerOptions} />
    </div>
  );
}
