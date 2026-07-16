import Link from "next/link";
import type { CalfRecord } from "@/lib/cow-calf/herd-types";
import { CALF_LIFECYCLE_STATUS_LABELS } from "@/lib/cow-calf/statuses";
import type { CalfLifecycleStatus } from "@/lib/cow-calf/inventory-calculations";

function calfStatusLabel(status: string | null): string {
  if (!status) return "—";
  if (status in CALF_LIFECYCLE_STATUS_LABELS) {
    return CALF_LIFECYCLE_STATUS_LABELS[status as CalfLifecycleStatus];
  }
  return status;
}

export function CalfList({
  calves,
}: {
  calves: Array<CalfRecord & { birth_processed?: boolean }>;
}) {
  if (!calves.length) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral bg-tan/10 px-4 py-8 text-center text-sm text-text-secondary">
        No calves recorded yet.{" "}
        <Link href="/cow-calf/calving/new" className="font-medium text-brown hover:underline">
          Log a calving
        </Link>{" "}
        to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {calves.map((calf) => (
        <li key={calf.id}>
          <article className="rounded-xl border border-border-neutral bg-surface-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-navy">
                  {calf.name ? `${calf.name} (${calf.tag_number})` : `Calf ${calf.tag_number}`}
                </h3>
                <p className="text-sm text-text-secondary">
                  {calf.sex ?? "Unknown sex"}
                  {calf.birth_date ? ` · Born ${calf.birth_date}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full bg-tan/30 px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {calfStatusLabel(calf.calf_lifecycle_status)}
                </span>
                {calf.birth_processed === false && calf.calf_lifecycle_status === "at_side" ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    Not processed
                  </span>
                ) : null}
              </div>
            </div>
            <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-secondary">Dam</dt>
                <dd className="font-medium text-navy">{calf.dam_tag ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Herd</dt>
                <dd className="font-medium text-navy">{calf.herd_name ?? "—"}</dd>
              </div>
              {calf.birth_weight_lbs != null ? (
                <div>
                  <dt className="text-text-secondary">Birth weight</dt>
                  <dd className="font-medium text-navy">{calf.birth_weight_lbs} lb</dd>
                </div>
              ) : null}
              {calf.location_name ? (
                <div>
                  <dt className="text-text-secondary">Location</dt>
                  <dd className="font-medium text-navy">{calf.location_name}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        </li>
      ))}
    </ul>
  );
}
