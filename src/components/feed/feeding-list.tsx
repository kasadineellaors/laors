import Link from "next/link";
import type { FeedingRecord } from "@/lib/feed/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface FeedingListProps {
  records: FeedingRecord[];
  emptyMessage?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  detailBasePath?: string;
  showRepeat?: boolean;
  newFeedingPath?: string;
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildRepeatHref(
  newFeedingPath: string,
  record: FeedingRecord,
): string {
  const params = new URLSearchParams();
  if (record.cattle_group_id) params.set("group", record.cattle_group_id);
  if (record.location_id) params.set("location", record.location_id);
  if (record.ownership_group_id) params.set("owner", record.ownership_group_id);
  if (record.feed_ration_id) params.set("ration", record.feed_ration_id);
  if (record.quantity > 0) params.set("quantity", String(record.quantity));
  const qs = params.toString();
  return qs ? `${newFeedingPath}?${qs}` : newFeedingPath;
}

function getLocationLine(record: FeedingRecord): string {
  if (record.location_label) return record.location_label;
  if (record.cattle_group_name) return record.cattle_group_name;
  return "No location";
}

function getLotLine(record: FeedingRecord): string | null {
  if (record.cattle_group_name && record.location_label) {
    return record.cattle_group_name;
  }
  return null;
}

export function FeedingList({
  records,
  emptyMessage,
  emptyActionHref = "/feed/log/new",
  emptyActionLabel = "+ Log Feeding",
  detailBasePath = "/feed/log",
  showRepeat = true,
  newFeedingPath = "/feed/log/new",
}: FeedingListProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-border-neutral bg-surface-white px-6 py-12 text-center">
        <p className="text-sm text-text-secondary">
          {emptyMessage ?? "No feedings have been logged yet."}
        </p>
        <Link href={emptyActionHref} className="mt-4 inline-block">
          <Button size="md">{emptyActionLabel}</Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((record) => {
        const lotLine = getLotLine(record);
        const repeatHref = buildRepeatHref(newFeedingPath, record);

        return (
          <li
            key={record.id}
            className="flex items-stretch gap-2 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white shadow-[var(--shadow-card)]"
          >
            <Link
              href={`${detailBasePath}/${record.id}`}
              className={cn(
                "min-w-0 flex-1 p-4 transition-colors",
                "hover:bg-tan/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{getLocationLine(record)}</p>
                  {lotLine ? (
                    <p className="mt-0.5 text-sm text-text-primary">{lotLine}</p>
                  ) : null}
                  {record.ownership_group_name ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      Owner:{" "}
                      <span className="text-text-primary">{record.ownership_group_name}</span>
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium text-text-primary">
                      {record.feed_ration_name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {record.quantity.toLocaleString()} {record.feed_ration_unit}
                      {record.total_feed_cost != null && record.total_feed_cost > 0
                        ? ` · ${formatCurrency(record.total_feed_cost)}`
                        : null}
                    </p>
                  </div>

                  {record.fed_by_name ? (
                    <p className="mt-2 text-xs text-text-secondary">
                      Fed by {record.fed_by_name}
                    </p>
                  ) : null}
                </div>

                <p className="shrink-0 text-sm font-medium text-text-secondary sm:text-right">
                  {formatDate(record.fed_at)}
                </p>
              </div>
            </Link>

            {showRepeat ? (
              <div className="flex shrink-0 items-center border-l border-border-neutral px-2 sm:px-3">
                <Link
                  href={repeatHref}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-navy",
                    "hover:bg-tan/30",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
                  )}
                >
                  Repeat
                </Link>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
