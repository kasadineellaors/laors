"use client";

import Link from "next/link";
import type { BullRecord } from "@/lib/cow-calf/types";
import { ANIMAL_STATUS_LABELS } from "@/lib/cow-calf/constants";

interface BullListProps {
  bulls: BullRecord[];
  emptyMessage?: string;
}

export function BullList({ bulls, emptyMessage }: BullListProps) {
  if (bulls.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No bulls registered yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {bulls.map((b) => (
        <li key={b.id}>
          <Link
            href={`/cow-calf/bulls/${b.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">
                  {b.tag_number}
                  {b.name ? ` · ${b.name}` : ""}
                </p>
                <p className="text-sm text-charcoal/70">
                  {ANIMAL_STATUS_LABELS[b.status]}
                  {b.cattle_group_name ? ` · ${b.cattle_group_name}` : ""}
                  {b.location_name ? ` · ${b.location_name}` : ""}
                </p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
