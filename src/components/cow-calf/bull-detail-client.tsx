"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BullRecord } from "@/lib/cow-calf/types";
import type { SelectOption } from "@/lib/locations/options";
import { ANIMAL_STATUS_LABELS } from "@/lib/cow-calf/constants";
import { archiveBull } from "@/lib/actions/bulls";
import { BullForm } from "@/components/cow-calf/bull-form";
import { Button } from "@/components/ui/button";

interface BullDetailClientProps {
  orgId: string;
  bull: BullRecord;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  canManage: boolean;
}

export function BullDetailClient({
  orgId,
  bull,
  locationOptions,
  groupOptions,
  canManage,
}: BullDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!confirm("Archive this bull record?")) return;
    setLoading(true);
    setError(null);
    const result = await archiveBull(orgId, bull.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/bulls");
  }

  if (editing) {
    return (
      <BullForm
        orgId={orgId}
        bull={bull}
        locationOptions={locationOptions}
        groupOptions={groupOptions}
        onSuccess={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4">
        <p className="text-sm text-text-secondary">Bull</p>
        <h2 className="mt-1 text-xl font-bold text-navy">
          {bull.tag_number}
          {bull.name ? ` · ${bull.name}` : ""}
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Status</dt>
            <dd className="font-medium">{ANIMAL_STATUS_LABELS[bull.status]}</dd>
          </div>
          {bull.cattle_group_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Herd group</dt>
              <dd className="font-medium">{bull.cattle_group_name}</dd>
            </div>
          ) : null}
          {bull.location_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium">{bull.location_name}</dd>
            </div>
          ) : null}
          {bull.birth_date ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Birth date</dt>
              <dd className="font-medium">{bull.birth_date}</dd>
            </div>
          ) : null}
          {bull.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="mt-1 font-medium">{bull.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="danger" disabled={loading} onClick={handleArchive}>
            {loading ? "Archiving…" : "Archive"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
