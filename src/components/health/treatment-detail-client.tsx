"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type { MedicineOption } from "@/lib/medicine/types";
import type { TreatmentRecord } from "@/lib/health/types";
import { TREATMENT_REASONS, treatmentTypeLabel } from "@/lib/health/constants";
import { archiveTreatment } from "@/lib/actions/health";
import {
  formatDoseLine,
  formatShortDate,
  formatWithdrawalStatus,
} from "@/lib/health/display";
import { TreatmentForm } from "@/components/health/treatment-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface TreatmentDetailClientProps {
  orgId: string;
  treatment: TreatmentRecord;
  currentUserId?: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  medicineOptions: MedicineOption[];
}

function reasonDisplay(reason: string | null): string | null {
  if (!reason?.trim()) return null;
  const match = TREATMENT_REASONS.find(
    (r) => r.value.toLowerCase() === reason.trim().toLowerCase(),
  );
  return match?.label ?? reason;
}

export function TreatmentDetailClient({
  orgId,
  treatment,
  currentUserId,
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
      <div className="space-y-4 pb-4">
        <Link href="/health/treatments" className="text-sm font-medium text-brown hover:underline">
          ← Treatments
        </Link>
        <TreatmentForm
          orgId={orgId}
          currentUserId={currentUserId}
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

  const reason = reasonDisplay(treatment.reason);
  const typeLabel = treatmentTypeLabel(treatment.treatment_type);
  const doseLine = formatDoseLine(
    treatment.quantity_used,
    treatment.head_count,
    treatment.medicine_unit,
  );
  const withdrawal = formatWithdrawalStatus(treatment.withdrawal_until);

  return (
    <div className="space-y-6 pb-4">
      <Link href="/health/treatments" className="text-sm font-medium text-brown hover:underline">
        ← Treatments
      </Link>

      <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-navy">{treatment.product_name}</h1>
          {withdrawal?.active ? (
            <span className="inline-flex rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning">
              Active withdrawal
            </span>
          ) : null}
        </div>
        {reason ? <p className="mt-1 text-text-secondary">{reason}</p> : null}
        {!reason && typeLabel ? <p className="mt-1 text-text-secondary">{typeLabel}</p> : null}
        <p className="mt-2 text-sm font-medium text-text-primary">
          {formatShortDate(treatment.treatment_date)}
        </p>

        <dl className="mt-6 space-y-4 text-sm">
          {treatment.cattle_group_name ? (
            <div>
              <dt className="text-text-secondary">Cattle group</dt>
              <dd className="font-medium text-text-primary">
                {treatment.cattle_group_name}
                {treatment.head_count != null ? ` · ${treatment.head_count} head treated` : ""}
              </dd>
            </div>
          ) : treatment.head_count != null ? (
            <div>
              <dt className="text-text-secondary">Head treated</dt>
              <dd className="font-medium text-text-primary">{treatment.head_count}</dd>
            </div>
          ) : null}
          {treatment.location_label ? (
            <div>
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium text-text-primary">{treatment.location_label}</dd>
            </div>
          ) : null}
          {treatment.administered_by_name ? (
            <div>
              <dt className="text-text-secondary">Administered by</dt>
              <dd className="font-medium text-text-primary">{treatment.administered_by_name}</dd>
            </div>
          ) : null}
          {doseLine ? (
            <div>
              <dt className="text-text-secondary">Quantity used</dt>
              <dd className="font-medium text-text-primary">{doseLine}</dd>
            </div>
          ) : null}
          {treatment.medicine_item_name && !doseLine ? (
            <div>
              <dt className="text-text-secondary">Inventory</dt>
              <dd className="font-medium text-text-primary">{treatment.medicine_item_name}</dd>
            </div>
          ) : null}
          {withdrawal ? (
            <div>
              <dt className="text-text-secondary">Withdrawal</dt>
              <dd
                className={cn(
                  "font-medium",
                  withdrawal.active ? "text-status-warning" : "text-text-primary",
                )}
              >
                {withdrawal.label}
              </dd>
            </div>
          ) : null}
          {typeLabel && reason ? (
            <div>
              <dt className="text-text-secondary">Treatment type</dt>
              <dd className="font-medium text-text-primary">{typeLabel}</dd>
            </div>
          ) : null}
          {treatment.notes ? (
            <div>
              <dt className="text-text-secondary">Symptoms and notes</dt>
              <dd className="font-medium text-text-primary whitespace-pre-wrap">{treatment.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
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
