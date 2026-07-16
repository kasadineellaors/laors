import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getOperationPlSummary } from "@/lib/reports/operations-pl";
import {
  currentMonthKey,
  formatShortMonth,
  shiftMonth,
} from "@/lib/reports/period";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Operation P&L — LAORS",
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function OperationPlPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireOnboardedUser();
  const { month: monthParam } = await searchParams;
  const month = monthParam?.match(/^\d{4}-\d{2}$/) ? monthParam : currentMonthKey();
  const pl = await getOperationPlSummary(session.organization!.id, month);

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm font-medium text-olive hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-charcoal">Operation P&amp;L</h1>
        <p className="text-charcoal/70">
          Ranch-wide profit and loss for {pl.monthLabel}.
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/reports/pl?month=${prev}`}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-olive hover:bg-olive/10"
        >
          ← {formatShortMonth(prev)}
        </Link>
        <Link
          href={`/reports/pl?month=${next}`}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-olive hover:bg-olive/10"
        >
          {formatShortMonth(next)} →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Sale revenue" value={money(pl.saleRevenue)} />
        <MiniStat label="Operating costs" value={money(pl.totalOperatingCosts)} />
        <MiniStat
          label="Net P&L"
          value={money(pl.netOperatingPl)}
          highlight={pl.netOperatingPl >= 0 ? "positive" : "negative"}
        />
        <MiniStat label="Head sold" value={String(pl.headSold)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Stat label="Cattle sales" value={money(pl.saleRevenue)} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operating costs</CardTitle>
          <CardDescription>Costs logged this month across all lots</CardDescription>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm sm:grid-cols-3">
          <Stat label="Cattle purchases" value={money(pl.cattlePurchases)} />
          <Stat label="Feed delivered" value={money(pl.feedCost)} />
          <Stat label="Medicine" value={money(pl.medicineCost)} />
          <Stat label="Processing" value={money(pl.processingCost)} />
          <Stat label="Other lot expenses" value={money(pl.otherExpenses)} />
          <Stat label="Death loss" value={money(pl.mortalityLoss)} />
          <Stat label="Total operating costs" value={money(pl.totalOperatingCosts)} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory &amp; movement</CardTitle>
          <CardDescription>Not included in net P&amp;L above</CardDescription>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Stat label="Commodity purchases" value={money(pl.commodityPurchases)} />
          <Stat label="Head received" value={String(pl.lotsReceived)} />
          <Stat label="Deaths" value={String(pl.deaths)} />
          <Stat label="Feed deliveries" value={String(pl.feedDeliveries)} />
        </dl>
      </Card>

      <Card className="border-olive/30 bg-olive/5">
        <CardHeader>
          <CardTitle>Net operating P&amp;L</CardTitle>
          <CardDescription>Sale revenue minus operating costs</CardDescription>
        </CardHeader>
        <p
          className={`px-4 pb-4 text-3xl font-bold tabular-nums ${
            pl.netOperatingPl >= 0 ? "text-olive" : "text-rust"
          }`}
        >
          {money(pl.netOperatingPl)}
        </p>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  return (
    <div>
      <dt className="text-charcoal/60">{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          highlight === "positive"
            ? "text-olive"
            : highlight === "negative"
              ? "text-rust"
              : "text-charcoal"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-4 text-center">
      <p
        className={`text-xl font-bold tabular-nums ${
          highlight === "positive"
            ? "text-olive"
            : highlight === "negative"
              ? "text-rust"
              : "text-olive"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-charcoal/60">{label}</p>
    </div>
  );
}
