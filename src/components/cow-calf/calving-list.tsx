"use client";

import Link from "next/link";
import type { CalvingRecord } from "@/lib/cow-calf/types";
import { CALF_SEX_LABELS, CALVING_OUTCOME_LABELS } from "@/lib/cow-calf/constants";

interface CalvingListProps {
  records: CalvingRecord[];
  emptyMessage?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CalvingList({ records, emptyMessage }: CalvingListProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
        {emptyMessage ?? "No calving records yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li key={r.id}>
          <Link
            href={`/cow-calf/calving/${r.id}`}
            className="block rounded-xl border border-border-neutral bg-surface-white px-4 py-3 hover:border-navy/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy">
                  {CALVING_OUTCOME_LABELS[r.outcome]}
                  {r.calf_tag ? ` · ${r.calf_tag}` : ""}
                  {r.dam_tag ? ` · Dam ${r.dam_tag}` : ""}
                </p>
                <p className="text-sm text-text-secondary">
                  {CALF_SEX_LABELS[r.calf_sex]}
                  {r.cattle_group_name ? ` · ${r.cattle_group_name}` : r.herd_name ? ` · ${r.herd_name}` : ""}
                  {r.twin_status && r.twin_status !== "single" ? ` · ${r.twin_status}` : ""}
                  {r.location_name ? ` · ${r.location_name}` : ""}
                </p>
                {r.inventory_added ? (
                  <p className="mt-1 text-xs font-medium text-sage">+1 head in inventory</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                {r.birth_weight_lbs != null ? (
                  <p className="text-lg font-bold text-brown">{r.birth_weight_lbs} lb</p>
                ) : null}
                <p className="text-xs text-text-secondary">{formatDate(r.calved_at)}</p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
