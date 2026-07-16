import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  currentMonthKey,
  formatShortMonth,
  getMonthlyOperationsSummary,
  shiftMonth,
} from "@/lib/reports/monthly";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Monthly Operations — LAORS",
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireOnboardedUser();
  const { month: monthParam } = await searchParams;
  const month = monthParam?.match(/^\d{4}-\d{2}$/) ? monthParam : currentMonthKey();
  const summary = await getMonthlyOperationsSummary(session.organization!.id, month);

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Reports
        </Link>
        <h1 className="mt-2 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Monthly operations</h1>
        <p className="text-text-secondary">{summary.monthLabel}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/reports/monthly?month=${prev}`}
          className="rounded-lg border border-border-neutral px-3 py-2 text-sm font-semibold text-brown hover:bg-tan/10"
        >
          ← {formatShortMonth(prev)}
        </Link>
        <Link
          href={`/reports/monthly?month=${next}`}
          className="rounded-lg border border-border-neutral px-3 py-2 text-sm font-semibold text-brown hover:bg-tan/10"
        >
          {formatShortMonth(next)} →
        </Link>
        <Link
          href={`/reports/pl?month=${month}`}
          className="rounded-lg border border-navy/40 bg-navy/10 px-3 py-2 text-sm font-semibold text-brown hover:bg-tan/20"
        >
          Full P&amp;L →
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Head movement</CardTitle>
          <CardDescription>Cattle in and out this month</CardDescription>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Stat label="Head received (lots)" value={String(summary.lotsReceived)} />
          <Stat label="Head sold" value={String(summary.headSold)} />
          <Stat label="Deaths" value={String(summary.deaths)} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Stat label="Deliveries logged" value={String(summary.feedDeliveries)} />
          <Stat label="Quantity fed" value={summary.feedQuantity.toLocaleString()} />
          <Stat label="Feed cost (logged)" value={money(summary.feedCost)} />
          <Stat label="Commodity purchases" value={money(summary.commodityPurchases)} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Stat label="Sale revenue" value={money(summary.saleRevenue)} />
          <Stat label="Cattle purchases" value={money(summary.cattlePurchases)} />
          <Stat label="Medicine" value={money(summary.medicineCost)} />
          <Stat label="Processing" value={money(summary.processingCost)} />
          <Stat label="Other lot expenses" value={money(summary.otherExpenses)} />
          <Stat label="Death loss" value={money(summary.mortalityLoss)} />
          <Stat
            label="Net operating P&L"
            value={money(summary.netOperatingPl)}
            highlight={summary.netOperatingPl >= 0 ? "positive" : "negative"}
          />
        </dl>
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
      <dt className="text-text-secondary">{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          highlight === "positive"
            ? "text-brown"
            : highlight === "negative"
              ? "text-status-critical"
              : "text-text-primary"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
