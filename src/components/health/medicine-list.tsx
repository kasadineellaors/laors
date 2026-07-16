import Link from "next/link";
import type { MedicineItemRecord } from "@/lib/medicine/types";
import { costLabelForUnit, formatMedicineUnit, formatQuantityWithUnit } from "@/lib/health/display";
import { cn } from "@/lib/utils/cn";

interface MedicineListProps {
  items: MedicineItemRecord[];
  emptyMessage?: string;
}

function stockStatus(item: MedicineItemRecord): {
  label: string;
  variant: "critical" | "warning" | "neutral";
} {
  if (item.is_out_of_stock) return { label: "Out of stock", variant: "critical" };
  if (item.is_low_stock) return { label: "Low stock", variant: "warning" };
  return { label: "In stock", variant: "neutral" };
}

export function MedicineList({ items, emptyMessage }: MedicineListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-border-neutral px-4 py-10 text-center text-sm text-text-secondary">
        {emptyMessage ?? "No medicine in inventory yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const status = stockStatus(item);
        const unit = formatMedicineUnit(item.unit);
        const cost =
          item.avg_unit_cost != null
            ? item.avg_unit_cost
            : item.price_per_cc != null
              ? item.price_per_cc
              : null;

        return (
          <li key={item.id}>
            <Link
              href={`/health/medicine/${item.id}`}
              className={cn(
                "group block rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4 shadow-[var(--shadow-card)] transition-all",
                "hover:border-navy/25 hover:shadow-[0_4px_12px_rgba(39,66,93,0.12)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
                "cursor-pointer",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-navy">{item.name}</p>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        status.variant === "critical" && "bg-status-critical-bg text-status-critical",
                        status.variant === "warning" && "bg-status-warning-bg text-status-warning",
                        status.variant === "neutral" && "bg-tan/50 text-text-secondary",
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-text-primary">
                    {formatQuantityWithUnit(item.quantity_on_hand, item.unit)} on hand
                  </p>
                </div>
                <span
                  className="shrink-0 text-lg text-text-secondary transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                >
                  ›
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                {cost != null ? (
                  <span>
                    {costLabelForUnit(item.unit)}: ${cost.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                ) : null}
                {item.reorder_at != null ? (
                  <span>
                    Reorder at {item.reorder_at.toLocaleString()} {unit}
                  </span>
                ) : null}
                {item.withdrawal_days != null && item.withdrawal_days > 0 ? (
                  <span>{item.withdrawal_days}-day meat withdrawal</span>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
