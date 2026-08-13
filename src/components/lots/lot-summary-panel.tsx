"use client";

import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import type { LotOperationalSummary } from "@/lib/lots/types";
import { LOT_STATUS_LABELS, type LotStatus } from "@/lib/lots/types";
import { formatAdgLbs } from "@/lib/inventory/adg";
import {
  getLotDisplayTitle,
  getLotLocationLabel,
  getLotOwnerName,
} from "@/lib/inventory/lot-display";
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

function LotStatusBadge({ status }: { status: LotStatus }) {
  const label = LOT_STATUS_LABELS[status] ?? status;

  if (status === "closed") {
    return (
      <span className="inline-flex items-center rounded-md bg-tan/20 px-2 py-0.5 text-sm font-medium text-text-secondary">
        {label}
      </span>
    );
  }

  if (status === "hospital") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-status-warning-bg px-2 py-0.5 text-sm font-medium text-status-warning">
        <span aria-hidden>⚠</span>
        {label}
      </span>
    );
  }

  if (status === "ready_to_sell") {
    return (
      <span className="inline-flex items-center rounded-md bg-status-info-bg px-2 py-0.5 text-sm font-medium text-status-info">
        {label}
      </span>
    );
  }

  return <span className="text-sm font-medium text-text-secondary">{label}</span>;
}

export function LotSummaryPanel({
  group,
  summary,
  canManage,
  onCloseLot,
  closing,
}: LotSummaryPanelProps) {
  const status = group.lot_status as LotStatus;
  const lotTitle = getLotDisplayTitle(group);
  const owner = getLotOwnerName(group);
  const location = getLotLocationLabel(group);

  const projectedMargin = summary.sale_revenue - summary.total_invested;

  return (
    <div className="space-y-4 rounded-xl border border-border-neutral bg-surface-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
              {lotTitle}
            </p>
            <LotStatusBadge status={status} />
          </div>
          {owner ? (
            <p className="mt-1 text-base font-semibold text-brown">{owner}</p>
          ) : (
            <p className="mt-1 text-sm text-text-secondary">No owner assigned</p>
          )}
          {location !== "No location assigned" ? (
            <p className="mt-0.5 text-sm text-text-secondary">{location}</p>
          ) : null}
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
          value={
            group.starting_head != null && group.starting_head > 0
              ? String(group.starting_head)
              : group.total_head > 0
                ? String(group.total_head)
                : "—"
          }
        />
        <Stat label="Days on feed" value={String(summary.days_on_feed)} />
        <Stat
          label="ADG"
          value={formatAdgLbs(summary.current_adg_lbs)}
          highlight={
            summary.current_adg_lbs != null && summary.current_adg_lbs < 0
              ? "negative"
              : summary.current_adg_lbs != null && summary.current_adg_lbs > 0
                ? "positive"
                : undefined
          }
        />
        <Stat
          label="Avg weight in"
          value={
            group.avg_weight_lbs != null ? `${Math.round(group.avg_weight_lbs)} lb` : "—"
          }
        />
        <Stat
          label="Current avg wt"
          value={
            group.current_avg_weight_lbs != null
              ? `${Math.round(group.current_avg_weight_lbs)} lb`
              : group.avg_weight_lbs != null
                ? `${Math.round(group.avg_weight_lbs)} lb`
                : "—"
          }
        />
        <Stat label="Total invested" value={money(summary.total_invested)} />
        <Stat label="Cost / head" value={money(summary.estimated_cost_per_head)} />
        <Stat label="Sale revenue" value={money(summary.sale_revenue)} />
        <Stat
          label="Death loss"
          value={
            summary.deaths > 0
              ? `${summary.deaths} hd · ${money(summary.death_value_lost)}`
              : "—"
          }
          highlight={summary.deaths > 0 ? "negative" : undefined}
        />
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
