"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type { MedicineOption } from "@/lib/medicine/types";
import type { TreatmentRecord } from "@/lib/health/types";
import { archiveTreatment } from "@/lib/actions/health";
import { TreatmentForm } from "@/components/health/treatment-form";
import { Button } from "@/components/ui/button";

interface TreatmentDetailClientProps {
  orgId: string;
  treatment: TreatmentRecord;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  medicineOptions: MedicineOption[];
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TreatmentDetailClient({
  orgId,
  treatment,
  locationOptions,
  groupOptions,
  memberOptions,
  medicineOptions,
}: TreatmentDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!window.confirm("Archive this treatment record?")) return;
    setLoading(true);
    const result = await archiveTreatment(orgId, treatment.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/health/treatments");
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href="/health/treatments" className="text-sm font-medium text-olive hover:underline">
          ← Treatments
        </Link>
        <TreatmentForm
          orgId={orgId}
          treatment={treatment}
          locationOptions={locationOptions}
          groupOptions={groupOptions}
          memberOptions={memberOptions}
          medicineOptions={medicineOptions}
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
      <Link href="/health/treatments" className="text-sm font-medium text-olive hover:underline">
        ← Treatments
      </Link>

      <div className="rounded-xl border border-border bg-surface px-4 py-5">
        <h1 className="text-2xl font-bold text-charcoal">{treatment.product_name}</h1>
        {treatment.treatment_type ? (
          <p className="mt-1 text-charcoal/70">{treatment.treatment_type}</p>
        ) : null}
        <p className="mt-2 text-sm text-charcoal/60">{formatDate(treatment.treatment_date)}</p>

        <dl className="mt-6 space-y-3 text-sm">
          {treatment.head_count != null ? (
            <div>
              <dt className="text-charcoal/50">Head count</dt>
              <dd className="font-medium text-charcoal">{treatment.head_count}</dd>
            </div>
          ) : null}
          {treatment.cattle_group_name ? (
            <div>
              <dt className="text-charcoal/50">Group</dt>
              <dd className="font-medium text-charcoal">{treatment.cattle_group_name}</dd>
            </div>
          ) : null}
          {treatment.location_label ? (
            <div>
              <dt className="text-charcoal/50">Location</dt>
              <dd className="font-medium text-charcoal">{treatment.location_label}</dd>
            </div>
          ) : null}
          {treatment.administered_by_name ? (
            <div>
              <dt className="text-charcoal/50">Administered by</dt>
              <dd className="font-medium text-charcoal">{treatment.administered_by_name}</dd>
            </div>
          ) : null}
          {treatment.medicine_item_name && treatment.quantity_used ? (
            <div>
              <dt className="text-charcoal/50">Inventory used</dt>
              <dd className="font-medium text-charcoal">
                {treatment.quantity_used} from {treatment.medicine_item_name}
              </dd>
            </div>
          ) : null}
          {treatment.notes ? (
            <div>
              <dt className="text-charcoal/50">Notes</dt>
              <dd className="font-medium text-charcoal">{treatment.notes}</dd>
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
