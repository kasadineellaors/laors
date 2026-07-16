"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExposureRecord } from "@/lib/seedstock/exposure-types";
import { updateExposure, archiveExposure } from "@/lib/actions/exposure";
import { cowToBullRatio } from "@/lib/cow-calf/reproduction-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExposureDetailClientProps {
  orgId: string;
  exposure: ExposureRecord;
  canManage: boolean;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ExposureDetailClient({ orgId, exposure, canManage }: ExposureDetailClientProps) {
  const router = useRouter();
  const [pullDate, setPullDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratio =
    exposure.exposed_cow_count && exposure.bull_id
      ? cowToBullRatio(exposure.exposed_cow_count, 1)
      : null;

  async function handlePull() {
    setLoading(true);
    setError(null);
    const result = await updateExposure(orgId, exposure.id, { exposureEnd: pullDate });
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleArchive() {
    if (!confirm("Archive this exposure record?")) return;
    setLoading(true);
    const result = await archiveExposure(orgId, exposure.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/breeding?tab=exposures");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4">
        <p className="text-sm text-text-secondary">
          {exposure.is_active !== false && !exposure.exposure_end ? "Active exposure" : "Ended"}
        </p>
        <h2 className="mt-1 text-xl font-bold text-navy">
          {exposure.herd_name ?? exposure.dam_tag ?? "Exposure"} ×{" "}
          {exposure.bull_tag ?? exposure.sire_tag ?? "Bull"}
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Turn-in</dt>
            <dd className="font-medium">{formatDate(exposure.exposure_start)}</dd>
          </div>
          {exposure.exposure_end ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Pull date</dt>
              <dd className="font-medium">{formatDate(exposure.exposure_end)}</dd>
            </div>
          ) : null}
          {exposure.exposed_cow_count ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Cows exposed</dt>
              <dd className="font-medium">
                {exposure.exposed_cow_count}
                {ratio ? ` (${ratio})` : ""}
              </dd>
            </div>
          ) : null}
          {exposure.duration_days != null ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Duration</dt>
              <dd className="font-medium">{exposure.duration_days} days</dd>
            </div>
          ) : null}
          {exposure.location_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium">{exposure.location_name}</dd>
            </div>
          ) : null}
          {exposure.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="mt-1 font-medium">{exposure.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {canManage && !exposure.exposure_end ? (
        <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4 space-y-3">
          <h3 className="font-semibold text-navy">Record bull pull</h3>
          <div>
            <Label>Pull date</Label>
            <Input type="date" value={pullDate} onChange={(e) => setPullDate(e.target.value)} />
          </div>
          <Button onClick={handlePull} disabled={loading}>
            {loading ? "Saving…" : "Record pull"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <Button variant="danger" disabled={loading} onClick={handleArchive}>
          Archive exposure
        </Button>
      ) : null}
    </div>
  );
}
