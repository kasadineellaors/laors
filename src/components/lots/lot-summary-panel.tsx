"use client";

import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import type { LotOperationalSummary } from "@/lib/lots/types";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS } from "@/lib/lots/types";
import { Button } from "@/components/ui/button";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface LotSummaryPanelProps {
  group: CattleGroupSummary;
  summary: LotOperationalSummary;
  canManage: boolean;
  onCloseLot?: () => void;
  closing?: boolean;
}

export function LotSummaryPanel({
  group,
  summary,
  canManage,
  onCloseLot,
  closing,
}: LotSummaryPanelProps) {
  const lotLabel = group.lot_number || group.name;
  const status = LOT_STATUS_LABELS[group.lot_status as keyof typeof LOT_STATUS_LABELS] ?? group.lot_status;
  const enterprise =
    ENTERPRISE_LABELS[group.enterprise_type as keyof typeof ENTERPRISE_LABELS] ??
    group.enterprise_type;

  const projectedMargin = summary.sale_revenue - summary.total_invested;

  return (
    <div className="space-y-4 rounded-xl border border-border-neutral bg-surface-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brown">Lot</p>
          <h2 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">{lotLabel}</h2>
          <p className="text-sm text-text-secondary">
            {enterprise} · {status}
            {group.seller_name ? ` · ${group.seller_name}` : ""}
          </p>
        </div>
        {canManage && group.lot_status !== "closed" && onCloseLot ? (
          <Button variant="secondary" size="lg" onClick={onCloseLot} disabled={closing}>
            {closing ? "Closing…" : "Close lot"}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="On feed now" value={`${group.total_head} head`} />
        <Stat
          label="Starting head"
          value={group.starting_head != null ? String(group.starting_head) : "—"}
        />
        <Stat label="Days on feed" value={String(summary.days_on_feed)} />
        <Stat
          label="Avg weight in"
          value={
            group.avg_weight_lbs != null ? `${Math.round(group.avg_weight_lbs)} lb` : "—"
          }
        />
        <Stat label="Total invested" value={money(summary.total_invested)} />
        <Stat label="Cost / head" value={money(summary.estimated_cost_per_head)} />
        <Stat label="Sale revenue" value={money(summary.sale_revenue)} />
        <Stat
          label="Projected margin"
          value={money(projectedMargin)}
          highlight={projectedMargin >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TabLink href={`/feed/log/new?group=${group.id}`} label="Log feed" />
        <TabLink href={`/health/treatments/new?group=${group.id}`} label="Treatment" />
        <TabLink href={`/sales/new?group=${group.id}`} label="Record sale" />
        <TabLink href={`/cattle/groups/${group.id}/closeout`} label="Closeout" />
        {group.customer_id ? (
          <TabLink
            href={`/invoices/generate?customer=${group.customer_id}`}
            label="Invoice"
          />
        ) : null}
        <TabLink href={`/cattle/move?from=${group.id}`} label="Move cattle" />
        <TabLink href={`/cattle/moves`} label="Move history" />
      </div>
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
    <div className="rounded-lg bg-tan-light/30 px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p
        className={`text-lg font-bold tabular-nums ${
          highlight === "positive"
            ? "text-brown"
            : highlight === "negative"
              ? "text-status-critical"
              : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border-neutral bg-cream/40 px-3 py-2 text-center text-sm font-semibold text-brown hover:bg-tan/10"
    >
      {label}
    </Link>
  );
}
