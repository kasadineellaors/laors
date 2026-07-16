import Link from "next/link";
import type { DashboardCommandCenter } from "@/lib/dashboard/queries";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface CommandCenterPanelProps {
  data: DashboardCommandCenter;
}

export function CommandCenterPanel({ data }: CommandCenterPanelProps) {
  const hasLots = data.active_lots > 0 || data.closed_lots > 0;

  if (!hasLots) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operations</CardTitle>
          <CardDescription>Receive your first lot to see ranch-wide KPIs here.</CardDescription>
        </CardHeader>
        <Link href="/cattle/new">
          <Button fullWidth size="lg">
            Receive lot
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Active lots" value={String(data.active_lots)} />
        <MiniStat label="Head on feed" value={String(data.total_open_head)} />
        <MiniStat
          label={`Net P&L (${data.month_label})`}
          value={money(data.net_operating_pl)}
          highlight={data.net_operating_pl >= 0 ? "positive" : "negative"}
        />
        <MiniStat label="Head sold (month)" value={String(data.head_sold_this_month)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>{data.month_label} operating snapshot</CardDescription>
          </CardHeader>
          <dl className="space-y-2 px-4 pb-4 text-sm">
            <Row label="Sale revenue" value={money(data.sale_revenue)} />
            <Row label="Operating costs" value={money(data.operating_costs)} />
            <Row
              label="Net P&L"
              value={money(data.net_operating_pl)}
              highlight={data.net_operating_pl >= 0 ? "positive" : "negative"}
            />
            <Row label="Head received" value={String(data.lots_received_this_month)} />
            <Row label="Head sold" value={String(data.head_sold_this_month)} />
          </dl>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <Link href="/reports/pl">
              <Button variant="secondary" fullWidth size="sm">
                Full P&L
              </Button>
            </Link>
            <Link href="/reports/monthly">
              <Button variant="outline" fullWidth size="sm">
                Operations
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Head by enterprise</CardTitle>
            <CardDescription>Open lots only</CardDescription>
          </CardHeader>
          {data.head_by_enterprise.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-text-secondary">No open lots with head.</p>
          ) : (
            <ul className="divide-y divide-border px-4 pb-4 text-sm">
              {data.head_by_enterprise.map((row) => (
                <li key={row.enterprise_type} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-navy">{row.label}</p>
                    <p className="text-xs text-text-secondary">
                      {row.lot_count} lot{row.lot_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-brown">{row.head}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 pb-4">
            <Link href="/reports/enterprise">
              <Button variant="outline" fullWidth size="sm">
                Enterprise P&L
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {data.attention_lots.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Lots needing attention</CardTitle>
            <CardDescription>Receiving, hospital, ready to sell, or partially sold</CardDescription>
          </CardHeader>
          <ul className="divide-y divide-border px-4 pb-4 text-sm">
            {data.attention_lots.map((lot) => (
              <li key={lot.id}>
                <Link
                  href={`/cattle/groups/${lot.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-brown"
                >
                  <div>
                    <p className="font-semibold text-navy">{lot.label}</p>
                    <p className="text-text-secondary">
                      {lot.status_label}
                      {lot.location ? ` · ${lot.location}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-brown">{lot.head} hd</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.low_feed_items.length > 0 ? (
        <Card className="border-status-critical/30 bg-status-critical/5">
          <CardHeader>
            <CardTitle>Low feedstock</CardTitle>
            <CardDescription>Below reorder level</CardDescription>
          </CardHeader>
          <ul className="space-y-2 px-4 pb-4 text-sm">
            {data.low_feed_items.map((item) => (
              <li key={item.id} className="flex justify-between rounded-lg bg-surface-white px-3 py-2">
                <span className="font-medium text-navy">{item.name}</span>
                <span className="text-status-critical">
                  {item.quantity_on_hand} {item.unit}
                </span>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Link href="/feed/inventory">
              <Button variant="secondary" fullWidth size="sm">
                Feed inventory
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  return (
    <div className="flex justify-between rounded-lg bg-cream px-3 py-2">
      <span className="text-text-secondary">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          highlight === "positive"
            ? "text-brown"
            : highlight === "negative"
              ? "text-status-critical"
              : "text-text-primary"
        }`}
      >
        {value}
      </span>
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
