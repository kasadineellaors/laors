import Link from "next/link";
import type { CowRecord } from "@/lib/cow-calf/types";
import { ANIMAL_STATUS_LABELS, COW_TYPE_LABELS } from "@/lib/cow-calf/constants";

interface CowListProps {
  cows: CowRecord[];
  emptyMessage?: string;
}

export function CowList({ cows, emptyMessage }: CowListProps) {
  if (cows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No cows registered yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {cows.map((c) => (
        <li key={c.id}>
          <Link
            href={`/cow-calf/cows/${c.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">
                  {c.tag_number}
                  {c.name ? ` · ${c.name}` : ""}
                </p>
                <p className="text-sm text-charcoal/70">
                  {COW_TYPE_LABELS[c.animal_type]} · {ANIMAL_STATUS_LABELS[c.status]}
                  {c.cattle_group_name ? ` · ${c.cattle_group_name}` : ""}
                  {c.location_name ? ` · ${c.location_name}` : ""}
                </p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
