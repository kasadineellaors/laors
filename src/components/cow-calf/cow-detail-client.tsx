"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CowRecord } from "@/lib/cow-calf/types";
import type { SelectOption } from "@/lib/locations/options";
import { ANIMAL_STATUS_LABELS, COW_TYPE_LABELS } from "@/lib/cow-calf/constants";
import { archiveCow } from "@/lib/actions/cows";
import { CowForm } from "@/components/cow-calf/cow-form";
import { Button } from "@/components/ui/button";

interface CowDetailClientProps {
  orgId: string;
  cow: CowRecord;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  canManage: boolean;
}

export function CowDetailClient({
  orgId,
  cow,
  locationOptions,
  groupOptions,
  canManage,
}: CowDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!confirm("Archive this cow record?")) return;
    setLoading(true);
    setError(null);
    const result = await archiveCow(orgId, cow.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/cows");
  }

  if (editing) {
    return (
      <CowForm
        orgId={orgId}
        cow={cow}
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
        <p className="text-sm text-text-secondary">{COW_TYPE_LABELS[cow.animal_type]}</p>
        <h2 className="mt-1 text-xl font-bold text-navy">
          {cow.tag_number}
          {cow.name ? ` · ${cow.name}` : ""}
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Status</dt>
            <dd className="font-medium">{ANIMAL_STATUS_LABELS[cow.status]}</dd>
          </div>
          {cow.cattle_group_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Herd group</dt>
              <dd className="font-medium">{cow.cattle_group_name}</dd>
            </div>
          ) : null}
          {cow.location_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium">{cow.location_name}</dd>
            </div>
          ) : null}
          {cow.birth_date ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Birth date</dt>
              <dd className="font-medium">{cow.birth_date}</dd>
            </div>
          ) : null}
          {cow.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="mt-1 font-medium">{cow.notes}</dd>
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
