import Link from "next/link";
import type { TreatmentRecord } from "@/lib/health/types";

interface TreatmentListProps {
  treatments: TreatmentRecord[];
  emptyMessage?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TreatmentList({ treatments, emptyMessage }: TreatmentListProps) {
  if (treatments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No treatments logged yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {treatments.map((t) => (
        <li key={t.id}>
          <Link
            href={`/health/treatments/${t.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">{t.product_name}</p>
                {t.treatment_type ? (
                  <p className="text-sm text-charcoal/70">{t.treatment_type}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-charcoal/50">
                {formatDate(t.treatment_date)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-charcoal/60">
              {t.head_count != null ? <span>{t.head_count} head</span> : null}
              {t.cattle_group_name ? <span>{t.cattle_group_name}</span> : null}
              {t.location_label ? <span>{t.location_label}</span> : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
