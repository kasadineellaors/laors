import Link from "next/link";
import type { RainfallRecord } from "@/lib/weather/types";

interface RainfallListProps {
  records: RainfallRecord[];
  emptyMessage?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RainfallList({ records, emptyMessage }: RainfallListProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No rainfall logged yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li key={r.id}>
          <Link
            href={`/weather/rainfall/${r.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-olive">{r.amount_inches}&quot;</p>
                {r.location_label ? (
                  <p className="text-sm text-charcoal/70">{r.location_label}</p>
                ) : (
                  <p className="text-sm text-charcoal/70">Ranch-wide</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-charcoal/50">
                {formatDate(r.recorded_date)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
