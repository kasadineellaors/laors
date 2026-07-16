"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BreedingRecord } from "@/lib/cow-calf/breeding-types";
import type { SelectOption } from "@/lib/locations/options";
import {
  BREEDING_METHOD_LABELS,
  PREGNANCY_STATUS_LABELS,
} from "@/lib/cow-calf/constants";
import { archiveBreeding } from "@/lib/actions/breeding";
import { BreedingForm } from "@/components/cow-calf/breeding-form";
import { PregnancyCheckForm } from "@/components/cow-calf/pregnancy-check-form";
import { Button } from "@/components/ui/button";

interface BullOption {
  value: string;
  label: string;
  tag: string;
}

interface DamOption {
  value: string;
  label: string;
  tag: string;
}

interface BreedingDetailClientProps {
  orgId: string;
  record: BreedingRecord;
  locationOptions: SelectOption[];
  herdOptions: SelectOption[];
  bullOptions: BullOption[];
  damOptions: DamOption[];
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

export function BreedingDetailClient({
  orgId,
  record,
  locationOptions,
  herdOptions,
  bullOptions,
  damOptions,
  canManage,
}: BreedingDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!confirm("Archive this breeding record?")) return;
    setLoading(true);
    setError(null);
    const result = await archiveBreeding(orgId, record.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/breeding");
  }

  if (editing) {
    return (
      <BreedingForm
        orgId={orgId}
        record={record}
        locationOptions={locationOptions}
        herdOptions={herdOptions}
        bullOptions={bullOptions}
        damOptions={damOptions}
        onSuccess={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  if (showCheck) {
    return (
      <PregnancyCheckForm
        orgId={orgId}
        breedingId={record.id}
        damLabel={record.dam_tag ?? record.dam_name}
        onSuccess={() => {
          setShowCheck(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4">
        <p className="text-sm text-text-secondary">Bred {formatDate(record.bred_at)}</p>
        <h2 className="mt-1 text-xl font-bold text-navy">
          {PREGNANCY_STATUS_LABELS[record.pregnancy_status]}
          {record.dam_tag ? ` · Dam ${record.dam_tag}` : ""}
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Method</dt>
            <dd className="font-medium">{BREEDING_METHOD_LABELS[record.breeding_method]}</dd>
          </div>
          {record.sire_tag ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Sire</dt>
              <dd className="font-medium">{record.sire_tag}</dd>
            </div>
          ) : null}
          {record.expected_calving_date ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Expected calving</dt>
              <dd className="font-medium">{formatDate(record.expected_calving_date)}</dd>
            </div>
          ) : null}
          {record.pregnancy_check_date ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Pregnancy check</dt>
              <dd className="font-medium">{formatDate(record.pregnancy_check_date)}</dd>
            </div>
          ) : null}
          {record.herd_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Breeding herd</dt>
              <dd className="font-medium">{record.herd_name}</dd>
            </div>
          ) : record.cattle_group_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Herd group</dt>
              <dd className="font-medium">{record.cattle_group_name}</dd>
            </div>
          ) : null}
          {record.location_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium">{record.location_name}</dd>
            </div>
          ) : null}
          {record.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="mt-1 font-medium">{record.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {canManage ? (
          <Button variant="secondary" onClick={() => setShowCheck(true)}>
            Record pregnancy check
          </Button>
        ) : null}
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
