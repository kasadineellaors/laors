import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { getInvoiceSummary, listInvoices } from "@/lib/invoices/queries";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Invoices</h1>
          <p className="text-charcoal/70">
            {summary.openCount} open ·{" "}
            {summary.unpaidTotal.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}{" "}
            outstanding
          </p>
        </div>
        {canCreate ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/invoices/generate">
              <Button size="lg" variant="secondary">
                Generate
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button size="lg">+ Invoice</Button>
            </Link>
          </div>
        ) : null}
      </div>

      <InvoiceList invoices={invoices} emptyMessage="No invoices yet." />
    </div>
  );
}
