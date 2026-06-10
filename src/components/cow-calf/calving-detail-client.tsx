"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalvingRecord } from "@/lib/cow-calf/types";
import type { SelectOption } from "@/lib/locations/options";
import type { ClassificationOption } from "@/lib/cow-calf/types";
import { CALF_SEX_LABELS, CALVING_OUTCOME_LABELS } from "@/lib/cow-calf/constants";
import { archiveCalving } from "@/lib/actions/calving";
import { CalvingForm } from "@/components/cow-calf/calving-form";
import { Button } from "@/components/ui/button";

interface CalvingDetailClientProps {
  orgId: string;
  record: CalvingRecord;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  classificationOptions: ClassificationOption[];
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

export function CalvingDetailClient({
  orgId,
  record,
  locationOptions,
  groupOptions,
  classificationOptions,
  canManage,
}: CalvingDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!confirm("Archive this calving record? Inventory added at birth will be reversed.")) return;
    setLoading(true);
    setError(null);
    const result = await archiveCalving(orgId, record.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/calving");
  }

  if (editing) {
    return (
      <CalvingForm
        orgId={orgId}
        record={record}
        locationOptions={locationOptions}
        groupOptions={groupOptions}
        classificationOptions={classificationOptions}
        onSuccess={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface px-4 py-4">
        <p className="text-sm text-charcoal/60">{formatDate(record.calved_at)}</p>
        <h2 className="mt-1 text-xl font-bold text-charcoal">
          {CALVING_OUTCOME_LABELS[record.outcome]}
          {record.calf_tag ? ` · ${record.calf_tag}` : ""}
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-charcoal/60">Sex</dt>
            <dd className="font-medium">{CALF_SEX_LABELS[record.calf_sex]}</dd>
          </div>
          {record.dam_tag ? (
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Dam</dt>
              <dd className="font-medium">{record.dam_tag}</dd>
            </div>
          ) : null}
          {record.sire_tag ? (
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Sire</dt>
              <dd className="font-medium">{record.sire_tag}</dd>
            </div>
          ) : null}
          {record.cattle_group_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Herd group</dt>
              <dd className="font-medium">{record.cattle_group_name}</dd>
            </div>
          ) : null}
          {record.location_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Location</dt>
              <dd className="font-medium">{record.location_name}</dd>
            </div>
          ) : null}
          {record.birth_weight_lbs != null ? (
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Birth weight</dt>
              <dd className="font-medium">{record.birth_weight_lbs} lb</dd>
            </div>
          ) : null}
          {record.inventory_added ? (
            <div className="flex justify-between gap-4">
              <dt className="text-charcoal/60">Inventory</dt>
              <dd className="font-medium text-sage">
                +1 {record.classification_name ?? "calf"} in herd
              </dd>
            </div>
          ) : null}
          {record.notes ? (
            <div>
              <dt className="text-charcoal/60">Notes</dt>
              <dd className="mt-1 font-medium">{record.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
        {canManage ? (
          <Button variant="danger" disabled={loading} onClick={handleArchive}>
            {loading ? "Archiving…" : "Archive"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
