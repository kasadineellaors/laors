"use client";

import Link from "next/link";
import type { ExposureRecord } from "@/lib/seedstock/exposure-types";
import { cowToBullRatio } from "@/lib/cow-calf/reproduction-helpers";

interface ExposureListProps {
  exposures: ExposureRecord[];
  detailHrefPrefix?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ExposureList({
  exposures,
  detailHrefPrefix = "/cow-calf/exposure",
}: ExposureListProps) {
  if (!exposures.length) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
        No bull exposure records yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {exposures.map((e) => {
        const ratio =
          e.exposed_cow_count && e.bull_id
            ? cowToBullRatio(e.exposed_cow_count, 1)
            : null;

        return (
          <li key={e.id}>
            <Link
              href={`${detailHrefPrefix}/${e.id}`}
              className="block rounded-xl border border-border-neutral bg-surface-white px-4 py-3 hover:border-navy/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">
                    {e.herd_name
                      ? `Herd: ${e.herd_name}`
                      : e.dam_tag
                        ? `Dam ${e.dam_tag}`
                        : "Exposure"}
                    {" × "}
                    {e.bull_tag ?? e.sire_tag ?? "Bull"}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {formatDate(e.exposure_start)}
                    {e.exposure_end ? ` – ${formatDate(e.exposure_end)}` : " – ongoing"}
                    {e.exposed_cow_count ? ` · ${e.exposed_cow_count} cows` : ""}
                    {ratio ? ` · ${ratio}` : ""}
                  </p>
                  {e.is_active === false || e.exposure_end ? (
                    <p className="mt-1 text-xs text-text-secondary">Pulled / closed</p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-brown">
                      Active · {e.duration_days ?? 0} days
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.is_active !== false && !e.exposure_end
                      ? "bg-green-100 text-green-800"
                      : "bg-tan/40 text-text-secondary"
                  }`}
                >
                  {e.is_active !== false && !e.exposure_end ? "Active" : "Ended"}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
