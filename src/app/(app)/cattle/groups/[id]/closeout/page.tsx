import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getCattleGroup } from "@/lib/inventory/queries";
import {
  getLotOperationalSummary,
  listMortalityRecords,
  listProcessingEvents,
} from "@/lib/lots/queries";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS } from "@/lib/lots/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Lot Closeout — LAORS",
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function LotCloseoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const group = await getCattleGroup(orgId, id);
  if (!group) notFound();

  const [summary, processing, deaths] = await Promise.all([
    getLotOperationalSummary(
      orgId,
      id,
      group.landed_cost,
      group.opened_at ?? group.arrival_date ?? group.purchase_date,
      group.total_head,
    ),
    listProcessingEvents(orgId, id),
    listMortalityRecords(orgId, id),
  ]);

  const startingHead = group.starting_head ?? group.total_head + summary.heads_sold + summary.deaths;
  const endingHead = group.total_head;
  const headReconciled =
    startingHead - summary.heads_sold - summary.deaths - endingHead;

  const purchaseCost = group.landed_cost ?? 0;
  const totalExpenses =
    purchaseCost +
    summary.estimated_feed_cost +
    summary.estimated_medicine_cost +
    summary.processing_cost +
    summary.death_value_lost +
    summary.other_expenses;

  const netProfit = summary.sale_revenue - totalExpenses;
  const profitPerHead =
    summary.heads_sold > 0 ? netProfit / summary.heads_sold : netProfit / Math.max(1, endingHead);

  const avgWeightIn = group.avg_weight_lbs;
  const totalGainLbs =
    avgWeightIn != null && group.pay_weight_lbs != null
      ? null
      : null;

  const enterprise =
    ENTERPRISE_LABELS[group.enterprise_type as keyof typeof ENTERPRISE_LABELS] ??
    group.enterprise_type;
  const status =
    LOT_STATUS_LABELS[group.lot_status as keyof typeof LOT_STATUS_LABELS] ?? group.lot_status;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/cattle/groups/${id}`}
          className="text-sm font-medium text-olive hover:underline"
        >
          ← Back to lot
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-charcoal">Lot closeout</h1>
        <p className="text-charcoal/70">
          {group.lot_number || group.name} · {enterprise} · {status}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lot identity</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Dt label="Owner" value={group.ownership_group_name ?? "Ranch"} />
          <Dt label="Customer" value={group.customer_name ?? "—"} />
          <Dt label="Seller" value={group.seller_name ?? "—"} />
          <Dt label="Source" value={group.source_name ?? "—"} />
          <Dt label="Purchase date" value={group.purchase_date ?? "—"} />
          <Dt label="Arrival" value={group.arrival_date ?? group.opened_at ?? "—"} />
          <Dt label="Pen" value={group.location_breadcrumb ?? "—"} />
          <Dt label="Days on feed" value={String(summary.days_on_feed)} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory reconciliation</CardTitle>
          <CardDescription>Head purchased through sold, deaths, and remaining</CardDescription>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Dt label="Head purchased" value={String(startingHead)} />
          <Dt label="Head sold" value={String(summary.heads_sold)} />
          <Dt label="Deaths" value={String(summary.deaths)} />
          <Dt label="Ending head" value={String(endingHead)} />
          <Dt
            label="Reconciliation"
            value={headReconciled === 0 ? "Balanced" : `${headReconciled} difference`}
            highlight={headReconciled !== 0 ? "warn" : undefined}
          />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed & health</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Dt label="Feed events" value={String(summary.feed_events)} />
          <Dt label="Feed cost" value={money(summary.estimated_feed_cost)} />
          <Dt label="Feed cost / head" value={money(summary.estimated_feed_cost / Math.max(1, startingHead))} />
          <Dt label="Treatments" value={String(summary.treatment_events)} />
          <Dt label="Medicine cost" value={money(summary.estimated_medicine_cost)} />
          <Dt label="Processing events" value={String(processing.length)} />
          <Dt label="Processing cost" value={money(summary.processing_cost)} />
          <Dt label="Other expenses" value={money(summary.other_expenses)} />
          <Dt label="Mortality records" value={String(deaths.length)} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial performance</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm">
          <Dt label="Purchase cost" value={money(purchaseCost)} />
          <Dt label="Total expenses" value={money(totalExpenses)} />
          <Dt label="Sale revenue" value={money(summary.sale_revenue)} />
          <Dt
            label="Net profit / loss"
            value={money(netProfit)}
            highlight={netProfit >= 0 ? "positive" : "negative"}
          />
          <Dt label="Profit per head" value={money(profitPerHead)} />
          <Dt label="Cost per head (invested)" value={money(summary.estimated_cost_per_head)} />
          {avgWeightIn != null ? (
            <Dt label="Avg weight in" value={`${Math.round(avgWeightIn)} lb`} />
          ) : null}
          {totalGainLbs != null ? (
            <Dt label="Total gain" value={`${totalGainLbs} lb`} />
          ) : null}
        </dl>
      </Card>

      <Link href={`/cattle/groups/${id}`}>
        <Button fullWidth size="lg" variant="secondary">
          Return to lot
        </Button>
      </Link>
    </div>
  );
}

function Dt({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative" | "warn";
}) {
  const valueClass =
    highlight === "positive"
      ? "text-olive font-bold"
      : highlight === "negative"
        ? "text-rust font-bold"
        : highlight === "warn"
          ? "text-amber-700 font-bold"
          : "font-semibold text-charcoal";

  return (
    <div>
      <dt className="text-charcoal/60">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  );
}
