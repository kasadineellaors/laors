"use client";

import Link from "next/link";
import type { BreedingRecord } from "@/lib/cow-calf/breeding-types";
import {
  BREEDING_METHOD_LABELS,
  PREGNANCY_STATUS_LABELS,
} from "@/lib/cow-calf/constants";

interface BreedingListProps {
  records: BreedingRecord[];
  emptyMessage?: string;
  detailHrefPrefix?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BreedingList({
  records,
  emptyMessage,
  detailHrefPrefix = "/cow-calf/breeding",
}: BreedingListProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
        {emptyMessage ?? "No breeding records yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li key={r.id}>
          <Link
            href={`${detailHrefPrefix}/${r.id}`}
            className="block rounded-xl border border-border-neutral bg-surface-white px-4 py-3 hover:border-navy/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy">
                  {PREGNANCY_STATUS_LABELS[r.pregnancy_status]}
                  {r.dam_tag ? ` · Dam ${r.dam_tag}` : ""}
                </p>
                <p className="text-sm text-text-secondary">
                  {BREEDING_METHOD_LABELS[r.breeding_method]}
                  {r.sire_tag ? ` · Sire ${r.sire_tag}` : ""}
                  {r.herd_name ? ` · ${r.herd_name}` : r.cattle_group_name ? ` · ${r.cattle_group_name}` : ""}
                </p>
                {r.expected_calving_date ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    Due {formatDate(r.expected_calving_date)}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-xs text-text-secondary">{formatDate(r.bred_at)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
