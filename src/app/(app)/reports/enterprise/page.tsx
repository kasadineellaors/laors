import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getEnterprisePlReport } from "@/lib/reports/enterprise";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Enterprise P&L — LAORS",
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function EnterpriseReportPage() {
  const session = await requireOnboardedUser();
  const rows = await getEnterprisePlReport(session.organization!.id);

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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm font-medium text-olive hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-charcoal">Enterprise P&amp;L</h1>
        <p className="text-charcoal/70">
          Costs and sales rolled up by lot enterprise type (all active lots).
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No lot data yet</CardTitle>
            <CardDescription>Receive a lot to see enterprise breakdown.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Active lots" value={String(totals.lots)} />
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
                  {row.lot_count} lot{row.lot_count === 1 ? "" : "s"} · {row.current_head} head
                  currently
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
