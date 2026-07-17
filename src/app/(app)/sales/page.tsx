import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSalesSummary, listArchivedSales, listSales } from "@/lib/sales/queries";
import { SalesList } from "@/components/sales/sales-list";
import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Sales — LAORS",
};

export default async function SalesPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [sales, archivedSales, summary] = await Promise.all([
    listSales(orgId),
    listArchivedSales(orgId),
    getSalesSummary(orgId),
  ]);

  return (
    <AppPageShell>
      <AppPageHeader
        title="Sales"
        subtitle={`${summary.totalHeadSoldLast30Days} head sold · ${summary.totalRevenueLast30Days.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        })} last 30 days`}
        actions={
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <ExportButtons orgId={orgId} recordType="sales" size="sm" />
            <Link href="/sales/new">
              <Button size="md" fullWidth className="sm:w-auto">
                + Sale
              </Button>
            </Link>
          </div>
        }
      />
      <SalesList sales={sales} archivedSales={archivedSales} emptyMessage="No sales yet — tap + Sale to record one." />
    </AppPageShell>
  );
}
