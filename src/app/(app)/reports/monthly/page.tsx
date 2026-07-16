import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { currentMonthKey, getMonthlyOperationsSummary } from "@/lib/reports/monthly";
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
        <Link href="/reports" className="text-sm font-medium text-olive hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-charcoal">Monthly operations</h1>
        <p className="text-charcoal/70">{summary.monthLabel}</p>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/reports/monthly?month=${prev}`}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-olive hover:bg-olive/10"
        >
          ← {formatShortMonth(prev)}
        </Link>
        <Link
          href={`/reports/monthly?month=${next}`}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-olive hover:bg-olive/10"
        >
          {formatShortMonth(next)} →
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
          <Stat label="Other lot expenses" value={money(summary.otherExpenses)} />
          <Stat
            label="Net (sales − feed − expenses)"
            value={money(
              summary.saleRevenue - summary.feedCost - summary.otherExpenses,
            )}
            highlight={
              summary.saleRevenue - summary.feedCost - summary.otherExpenses >= 0
                ? "positive"
                : "negative"
            }
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

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatShortMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short", year: "numeric" });
}
