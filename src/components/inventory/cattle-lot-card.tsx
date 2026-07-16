import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import {
  buildLotSupportingDetails,
  getLotLocationLabel,
  getLotOwnerName,
} from "@/lib/inventory/lot-display";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS, type LotStatus } from "@/lib/lots/types";
import { cn } from "@/lib/utils/cn";

interface CattleLotCardProps {
  group: CattleGroupSummary;
}

function StatusBadge({ group }: { group: CattleGroupSummary }) {
  const status = group.lot_status as LotStatus;
  const label = LOT_STATUS_LABELS[status] ?? status;

  if (status === "closed") {
    return (
      <span className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
        Closed
      </span>
    );
  }

  if (status === "hospital") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-status-warning-bg px-2 py-0.5 text-xs font-medium text-status-warning">
        <span aria-hidden>⚠</span>
        {label}
      </span>
    );
  }

  if (status === "ready_to_sell") {
    return (
      <span className="inline-flex items-center rounded-md bg-status-info-bg px-2 py-0.5 text-xs font-medium text-status-info">
        {label}
      </span>
    );
  }

  return (
    <span className="text-sm text-text-secondary">{label}</span>
  );
}

export function CattleLotCard({ group }: CattleLotCardProps) {
  const lotLabel = group.lot_number || group.name;
  const enterprise =
    ENTERPRISE_LABELS[group.enterprise_type as keyof typeof ENTERPRISE_LABELS] ??
    group.enterprise_type;
  const owner = getLotOwnerName(group);
  const location = getLotLocationLabel(group);
  const details = buildLotSupportingDetails(group);

  return (
    <Link
      href={`/cattle/groups/${group.id}`}
      className={cn(
        "group block rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4 shadow-[var(--shadow-card)] transition-all",
        "hover:border-navy/25 hover:shadow-[0_4px_12px_rgba(39,66,93,0.12)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
        "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-navy">{lotLabel}</h2>

          <p className="mt-1 text-sm text-text-primary">
            <span className="font-medium">{enterprise}</span>
            <span className="text-text-secondary"> • </span>
            <StatusBadge group={group} />
          </p>

          <p className="mt-1 text-sm text-text-secondary">{location}</p>

          {owner ? (
            <p className="mt-1 text-sm text-text-secondary">
              Owner: <span className="text-text-primary">{owner}</span>
            </p>
          ) : null}

          {details.length > 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">{details.join(" • ")}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none text-navy sm:text-3xl">
              {group.total_head}
            </p>
            <p className="mt-1 text-xs font-medium text-text-secondary">head</p>
          </div>
          <span
            className="text-lg text-text-secondary transition-transform group-hover:translate-x-0.5"
            aria-hidden
          >
            ›
          </span>
        </div>
      </div>
    </Link>
  );
}
