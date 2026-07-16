import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { getInvoiceSummary, listInvoices } from "@/lib/invoices/queries";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Invoices — LAORS",
};

export default async function InvoicesPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [invoices, summary] = await Promise.all([
    listInvoices(orgId),
    getInvoiceSummary(orgId),
  ]);

  const canCreate = canManageInvoices(session.membership?.system_role);

  return (
    <AppPageShell>
      <AppPageHeader
        title="Sales & Billing"
        subtitle={`${summary.openCount} open · ${summary.unpaidTotal.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        })} outstanding`}
        actions={
          canCreate ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/invoices/generate">
                <Button size="md" variant="secondary" fullWidth className="sm:w-auto">
                  Generate
                </Button>
              </Link>
              <Link href="/invoices/new">
                <Button size="md" fullWidth className="sm:w-auto">
                  + Invoice
                </Button>
              </Link>
            </div>
          ) : undefined
        }
      />
      <InvoiceList invoices={invoices} emptyMessage="No invoices yet." />
    </AppPageShell>
  );
}
