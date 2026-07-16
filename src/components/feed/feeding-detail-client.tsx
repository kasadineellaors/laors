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
  rationUnitCosts?: Record<string, number>;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  ownerOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  listPath?: string;
  detailBasePath?: string;
  newFeedingPath?: string;
  backLabel?: string;
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildRepeatHref(newFeedingPath: string, feeding: FeedingRecord): string {
  const params = new URLSearchParams();
  if (feeding.cattle_group_id) params.set("group", feeding.cattle_group_id);
  if (feeding.location_id) params.set("location", feeding.location_id);
  if (feeding.ownership_group_id) params.set("owner", feeding.ownership_group_id);
  if (feeding.feed_ration_id) params.set("ration", feeding.feed_ration_id);
  if (feeding.quantity > 0) params.set("quantity", String(feeding.quantity));
  const qs = params.toString();
  return qs ? `${newFeedingPath}?${qs}` : newFeedingPath;
}

export function FeedingDetailClient({
  orgId,
  feeding,
  rationOptions,
  rationUnitCosts,
  locationOptions,
  groupOptions,
  ownerOptions,
  memberOptions,
  listPath = "/feed/log",
  detailBasePath = "/feed/log",
  newFeedingPath = "/feed/log/new",
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
        <Link href={listPath} className="text-sm font-medium text-brown hover:underline">
          {backLabel}
        </Link>
        <FeedingForm
          orgId={orgId}
          feeding={feeding}
          rationOptions={rationOptions}
          rationUnitCosts={rationUnitCosts}
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

  const repeatHref = buildRepeatHref(newFeedingPath, feeding);

  return (
    <div className="space-y-6">
      <Link href={listPath} className="text-sm font-medium text-brown hover:underline">
        {backLabel}
      </Link>

      <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-5 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-bold text-navy">{feeding.feed_ration_name}</h1>
        <p className="mt-1 text-text-secondary">
          {feeding.quantity.toLocaleString()} {feeding.feed_ration_unit}
        </p>
        <p className="mt-2 text-sm text-text-secondary">{formatDate(feeding.fed_at)}</p>

        <dl className="mt-6 space-y-3 text-sm">
          {feeding.location_label ? (
            <div>
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium text-text-primary">{feeding.location_label}</dd>
            </div>
          ) : null}
          {feeding.cattle_group_name ? (
            <div>
              <dt className="text-text-secondary">Cattle lot</dt>
              <dd className="font-medium text-text-primary">{feeding.cattle_group_name}</dd>
            </div>
          ) : null}
          {feeding.ownership_group_name ? (
            <div>
              <dt className="text-text-secondary">Owner</dt>
              <dd className="font-medium text-text-primary">{feeding.ownership_group_name}</dd>
            </div>
          ) : null}
          {feeding.head_count != null ? (
            <div>
              <dt className="text-text-secondary">Head fed</dt>
              <dd className="font-medium text-text-primary">{feeding.head_count}</dd>
            </div>
          ) : null}
          {feeding.total_feed_cost != null && feeding.total_feed_cost > 0 ? (
            <div>
              <dt className="text-text-secondary">Feed cost</dt>
              <dd className="font-medium text-text-primary">
                {formatCurrency(feeding.total_feed_cost)}
                {feeding.unit_cost_snapshot != null ? (
                  <span className="text-text-secondary">
                    {" "}
                    ({formatCurrency(feeding.unit_cost_snapshot)}/{feeding.feed_ration_unit})
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {feeding.fed_by_name ? (
            <div>
              <dt className="text-text-secondary">Fed by</dt>
              <dd className="font-medium text-text-primary">{feeding.fed_by_name}</dd>
            </div>
          ) : null}
          {feeding.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="font-medium text-text-primary">{feeding.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button size="lg" onClick={() => setEditing(true)} disabled={loading}>
          Edit
        </Button>
        <Link href={repeatHref}>
          <Button variant="secondary" size="lg" fullWidth disabled={loading}>
            Repeat
          </Button>
        </Link>
        <Button variant="outline" size="lg" onClick={handleArchive} disabled={loading}>
          Archive
        </Button>
      </div>
    </div>
  );
}
