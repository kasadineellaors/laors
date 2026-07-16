"use client";

import Link from "next/link";
import type { BreedingRecord, BreedingSummary } from "@/lib/cow-calf/breeding-types";
import type { ExposureRecord } from "@/lib/seedstock/exposure-types";
import { BreedingList } from "@/components/cow-calf/breeding-list";
import { ExposureList } from "@/components/cow-calf/exposure-list";
import { Button } from "@/components/ui/button";

type Tab = "records" | "exposures" | "due";

interface BreedingHubClientProps {
  records: BreedingRecord[];
  exposures: ExposureRecord[];
  dueSoon: BreedingRecord[];
  summary: BreedingSummary;
  pregnancyRateLabel: string;
  canManage: boolean;
  initialTab?: Tab;
}

const TAB_ITEMS: { id: Tab; label: string }[] = [
  { id: "records", label: "Breeding records" },
  { id: "exposures", label: "Bull exposure" },
  { id: "due", label: "Due soon" },
];

function tabHref(tab: Tab) {
  return tab === "records" ? "/cow-calf/breeding" : `/cow-calf/breeding?tab=${tab}`;
}

export function BreedingHubClient({
  records,
  exposures,
  dueSoon,
  summary,
  pregnancyRateLabel,
  canManage,
  initialTab = "records",
}: BreedingHubClientProps) {
  const tab = initialTab;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active exposures" value={summary.activeExposures} />
        <StatCard label="Bred / confirmed" value={summary.activeBred + summary.confirmed} />
        <StatCard label="Due in 30 days" value={summary.dueNext30Days} />
        <StatCard label="Open" value={summary.open} />
      </div>

      <p className="text-sm text-text-secondary">{pregnancyRateLabel}</p>

      <div className="flex flex-wrap gap-2">
        {TAB_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={tabHref(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "bg-navy text-surface-white"
                : "bg-tan/30 text-text-secondary hover:bg-tan/50"
            }`}
          >
            {item.label}
            {item.id === "exposures" && summary.activeExposures > 0
              ? ` (${summary.activeExposures})`
              : ""}
            {item.id === "due" && summary.dueNext30Days > 0 ? ` (${summary.dueNext30Days})` : ""}
          </Link>
        ))}
      </div>

      {tab === "records" ? (
        <BreedingList records={records} />
      ) : null}

      {tab === "exposures" ? (
        <div className="space-y-4">
          {canManage ? (
            <Link href="/cow-calf/exposure/new">
              <Button size="lg">+ Record exposure</Button>
            </Link>
          ) : null}
          <ExposureList exposures={exposures} />
        </div>
      ) : null}

      {tab === "due" ? (
        <BreedingList
          records={dueSoon}
          emptyMessage="No cows expected to calve in the next 30 days."
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}
