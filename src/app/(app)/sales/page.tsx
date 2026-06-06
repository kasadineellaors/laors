import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSalesSummary, listSales } from "@/lib/sales/queries";
import { SalesList } from "@/components/sales/sales-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sales — LAORS",
};

export default async function SalesPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [sales, summary] = await Promise.all([
    listSales(orgId),
    getSalesSummary(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Sales</h1>
          <p className="text-charcoal/70">
            {summary.totalHeadSoldLast30Days} head sold ·{" "}
            {summary.totalRevenueLast30Days.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}{" "}
            last 30 days
          </p>
        </div>
        <Link href="/sales/new">
          <Button size="lg">+ Sale</Button>
        </Link>
      </div>

      <SalesList
        sales={sales}
        emptyMessage="No sales yet — tap + Sale to record one."
      />
    </div>
  );
}
