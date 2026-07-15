import Link from "next/link";
import type { FeedingRecord } from "@/lib/feed/types";

interface FeedingListProps {
  records: FeedingRecord[];
  emptyMessage?: string;
  detailBasePath?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FeedingList({ records, emptyMessage, detailBasePath = "/feed/log" }: FeedingListProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No feedings logged yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li key={r.id}>
          <Link
            href={`${detailBasePath}/${r.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">
                  {r.location_label ?? "No pen"}
                  {r.ownership_group_name ? ` · ${r.ownership_group_name}` : ""}
                </p>
                <p className="text-sm text-charcoal/70">
                  {r.feed_ration_name} — {r.quantity} {r.feed_ration_unit}
                </p>
              </div>
              <span className="shrink-0 text-xs text-charcoal/50">{formatDate(r.fed_at)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-charcoal/60">
              {r.cattle_group_name ? <span>{r.cattle_group_name}</span> : null}
              {r.head_count != null ? <span>{r.head_count} head</span> : null}
              {r.fed_by_name ? <span>Fed by {r.fed_by_name}</span> : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
