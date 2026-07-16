"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type { FeedRationOption, FeedingRecord } from "@/lib/feed/types";
import { archiveFeeding } from "@/lib/actions/feed";
import { FeedingForm } from "@/components/feed/feeding-form";
import { Button } from "@/components/ui/button";

interface FeedingDetailClientProps {
  orgId: string;
  feeding: FeedingRecord;
  rationOptions: FeedRationOption[];
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  ownerOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  listPath?: string;
  detailBasePath?: string;
  backLabel?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FeedingDetailClient({
  orgId,
  feeding,
  rationOptions,
  locationOptions,
  groupOptions,
  ownerOptions,
  memberOptions,
  listPath = "/feed/log",
  detailBasePath = "/feed/log",
  backLabel = "← Feed log",
}: FeedingDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!window.confirm("Archive this feeding record?")) return;
    setLoading(true);
    const result = await archiveFeeding(orgId, feeding.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push(listPath);
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href={listPath} className="text-sm font-medium text-olive hover:underline">
          {backLabel}
        </Link>
        <FeedingForm
          orgId={orgId}
          feeding={feeding}
          rationOptions={rationOptions}
          locationOptions={locationOptions}
          groupOptions={groupOptions}
          ownerOptions={ownerOptions}
          memberOptions={memberOptions}
          feedingContext={feeding.feeding_context}
          detailBasePath={detailBasePath}
          listPath={listPath}
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={listPath} className="text-sm font-medium text-olive hover:underline">
        {backLabel}
      </Link>

      <div className="rounded-xl border border-border bg-surface px-4 py-5">
        <h1 className="text-2xl font-bold text-charcoal">{feeding.feed_ration_name}</h1>
        <p className="mt-1 text-charcoal/70">
          {feeding.quantity} {feeding.feed_ration_unit}
        </p>
        <p className="mt-2 text-sm text-charcoal/60">{formatDate(feeding.fed_at)}</p>

        <dl className="mt-6 space-y-3 text-sm">
          {feeding.location_label ? (
            <div>
              <dt className="text-charcoal/50">Location</dt>
              <dd className="font-medium text-charcoal">{feeding.location_label}</dd>
            </div>
          ) : null}
          {feeding.cattle_group_name ? (
            <div>
              <dt className="text-charcoal/50">Herd</dt>
              <dd className="font-medium text-charcoal">{feeding.cattle_group_name}</dd>
            </div>
          ) : null}
          {feeding.ownership_group_name ? (
            <div>
              <dt className="text-charcoal/50">Owner</dt>
              <dd className="font-medium text-charcoal">{feeding.ownership_group_name}</dd>
            </div>
          ) : null}
          {feeding.head_count != null ? (
            <div>
              <dt className="text-charcoal/50">Head fed</dt>
              <dd className="font-medium text-charcoal">{feeding.head_count}</dd>
            </div>
          ) : null}
          {feeding.total_feed_cost != null && feeding.total_feed_cost > 0 ? (
            <div>
              <dt className="text-charcoal/50">Feed cost</dt>
              <dd className="font-medium text-charcoal">
                ${feeding.total_feed_cost.toFixed(2)}
                {feeding.unit_cost_snapshot != null ? (
                  <span className="text-charcoal/60">
                    {" "}
                    (${feeding.unit_cost_snapshot.toFixed(2)}/{feeding.feed_ration_unit})
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {feeding.fed_by_name ? (
            <div>
              <dt className="text-charcoal/50">Fed by</dt>
              <dd className="font-medium text-charcoal">{feeding.fed_by_name}</dd>
            </div>
          ) : null}
          {feeding.notes ? (
            <div>
              <dt className="text-charcoal/50">Notes</dt>
              <dd className="font-medium text-charcoal">{feeding.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={() => setEditing(true)} disabled={loading}>
          Edit
        </Button>
        <Button variant="outline" size="lg" onClick={handleArchive} disabled={loading}>
          Archive
        </Button>
      </div>
    </div>
  );
}
