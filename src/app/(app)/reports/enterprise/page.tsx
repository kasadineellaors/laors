import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getEnterprisePlReport } from "@/lib/reports/enterprise";
import {
  currentMonthKey,
  formatShortMonth,
  monthBounds,
  shiftMonth,
} from "@/lib/reports/period";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Enterprise P&L — LAORS",
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function EnterpriseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireOnboardedUser();
  const { month: monthParam } = await searchParams;
  const month = monthParam?.match(/^\d{4}-\d{2}$/) ? monthParam : undefined;
  const rows = await getEnterprisePlReport(session.organization!.id, month);

  const totals = rows.reduce(
    (acc, r) => ({
      lots: acc.lots + r.lot_count,
      head: acc.head + r.current_head,
      invested: acc.invested + r.total_invested,
      revenue: acc.revenue + r.sale_revenue,
      net: acc.net + r.net_position,
    }),
    { lots: 0, head: 0, invested: 0, revenue: 0, net: 0 },
  );

  const periodLabel = month ? monthBounds(month).label : "All time";
  const prev = month ? shiftMonth(month, -1) : undefined;
  const next = month ? shiftMonth(month, 1) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Reports
        </Link>
        <h1 className="mt-2 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Enterprise P&amp;L</h1>
        <p className="text-text-secondary">
          Costs and sales by enterprise type — {periodLabel.toLowerCase()}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/reports/enterprise"
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            !month
              ? "border-navy bg-navy/10 text-brown"
              : "border-border-neutral text-brown hover:bg-tan/10"
          }`}
        >
          All time
        </Link>
        <Link
          href={`/reports/enterprise?month=${month ?? currentMonthKey()}`}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            month
              ? "border-navy bg-navy/10 text-brown"
              : "border-border-neutral text-brown hover:bg-tan/10"
          }`}
        >
          By month
        </Link>
        {month && prev && next ? (
          <>
            <Link
              href={`/reports/enterprise?month=${prev}`}
              className="rounded-lg border border-border-neutral px-3 py-2 text-sm font-semibold text-brown hover:bg-tan/10"
            >
              ← {formatShortMonth(prev)}
            </Link>
            <Link
              href={`/reports/enterprise?month=${next}`}
              className="rounded-lg border border-border-neutral px-3 py-2 text-sm font-semibold text-brown hover:bg-tan/10"
            >
              {formatShortMonth(next)} →
            </Link>
          </>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No lot data yet</CardTitle>
            <CardDescription>
              {month
                ? "No enterprise activity logged this month."
                : "Receive a lot to see enterprise breakdown."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label={month ? "Lots active" : "Active lots"}
              value={String(totals.lots)}
            />
            <MiniStat label="Head on feed" value={String(totals.head)} />
            <MiniStat label="Total invested" value={money(totals.invested)} />
            <MiniStat
              label="Net position"
              value={money(totals.net)}
              highlight={totals.net >= 0 ? "positive" : "negative"}
            />
          </div>

          {rows.map((row) => (
            <Card key={row.enterprise_type}>
              <CardHeader>
                <CardTitle>{row.label}</CardTitle>
                <CardDescription>
                  {row.lot_count} lot{row.lot_count === 1 ? "" : "s"} with
                  {month ? " activity" : " lifetime costs"}
                  {row.current_head > 0 ? ` · ${row.current_head} head currently` : ""}
                </CardDescription>
              </CardHeader>
              <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm sm:grid-cols-3">
                <Stat label="Purchase cost" value={money(row.purchase_cost)} />
                <Stat label="Feed" value={money(row.feed_cost)} />
                <Stat label="Medicine" value={money(row.medicine_cost)} />
                <Stat label="Processing" value={money(row.processing_cost)} />
                <Stat label="Other expenses" value={money(row.other_expenses)} />
                <Stat label="Total invested" value={money(row.total_invested)} />
                <Stat label="Sale revenue" value={money(row.sale_revenue)} />
                <Stat
                  label="Net position"
                  value={money(row.net_position)}
                  highlight={row.net_position >= 0 ? "positive" : "negative"}
                />
              </dl>
            </Card>
          ))}
        </>
      )}
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
    <div className="rounded-xl border border-border-neutral bg-surface-white px-3 py-4 text-center">
      <p
        className={`text-xl font-bold tabular-nums ${
          highlight === "positive"
            ? "text-brown"
            : highlight === "negative"
              ? "text-status-critical"
              : "text-brown"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
