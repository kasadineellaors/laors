import Link from "next/link";
import type { CowCalfHerd, HerdInventorySummary } from "@/lib/cow-calf/herd-types";
import { HERD_STATUS_LABELS, RECORDKEEPING_MODE_LABELS } from "@/lib/cow-calf/statuses";

export function HerdCard({
  herd,
  inventory,
}: {
  herd: CowCalfHerd;
  inventory: HerdInventorySummary;
}) {
  return (
    <Link
      href={`/cow-calf/herds/${herd.id}`}
      className="block rounded-xl border border-border-neutral bg-surface-white p-4 transition-colors hover:border-navy hover:bg-tan/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-navy">{herd.name}</h3>
          <p className="text-sm text-text-secondary">
            {herd.location_name ?? "No location assigned"}
          </p>
        </div>
        <span className="rounded-full bg-tan/30 px-2 py-0.5 text-xs font-medium text-text-secondary">
          {HERD_STATUS_LABELS[herd.status]}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-text-secondary">Cows</dt>
          <dd className="font-semibold text-navy">{inventory.cows}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Calves at side</dt>
          <dd className="font-semibold text-navy">{inventory.calvesAtSide}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Pairs</dt>
          <dd className="font-semibold text-brown">{inventory.pairs}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Total head</dt>
          <dd className="font-semibold text-navy">{inventory.totalPhysicalHead}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-text-secondary">
        {RECORDKEEPING_MODE_LABELS[herd.recordkeeping_mode]}
        {herd.owner_name ? ` · ${herd.owner_name}` : ""}
        {inventory.bulls > 0 ? ` · ${inventory.bulls} bull${inventory.bulls === 1 ? "" : "s"}` : ""}
      </p>
    </Link>
  );
}
