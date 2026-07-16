"use client";

import { useState } from "react";
import Link from "next/link";
import type { CalvingRecord } from "@/lib/cow-calf/types";
import type { SelectOption } from "@/lib/locations/options";
import type { WeaningRecord } from "@/lib/seedstock/weaning-types";
import {
  ASSISTANCE_TYPE_LABELS,
  CALF_SEX_LABELS,
  CALVING_OUTCOME_LABELS,
} from "@/lib/cow-calf/constants";
import { SeedstockCalvingForm } from "@/components/seedstock/seedstock-calving-form";
import { WeaningForm, WeaningRecordList } from "@/components/seedstock/weaning-form";
import { Button } from "@/components/ui/button";

interface AnimalOption {
  value: string;
  label: string;
  tag: string;
}

interface SeedstockCalvingDetailClientProps {
  orgId: string;
  record: CalvingRecord;
  weaningRecords: WeaningRecord[];
  locationOptions: SelectOption[];
  damOptions: AnimalOption[];
  sireOptions: AnimalOption[];
  canManage: boolean;
}

export function SeedstockCalvingDetailClient({
  orgId,
  record,
  weaningRecords,
  locationOptions,
  damOptions,
  sireOptions,
  canManage,
}: SeedstockCalvingDetailClientProps) {
  const [showWeaningForm, setShowWeaningForm] = useState(false);
  const canWean = record.outcome === "live" && weaningRecords.length === 0;

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border-neutral bg-surface-white p-4">
          <h1 className="text-xl font-bold text-navy">
            {record.dam_tag} → {record.calf_tag ?? "Calf"}
          </h1>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-text-secondary">Date</dt><dd>{record.calved_at}</dd></div>
            <div><dt className="text-text-secondary">Outcome</dt><dd>{CALVING_OUTCOME_LABELS[record.outcome]}</dd></div>
            <div><dt className="text-text-secondary">Sex</dt><dd>{CALF_SEX_LABELS[record.calf_sex]}</dd></div>
            {record.assistance_type ? (
              <div><dt className="text-text-secondary">Assistance</dt><dd>{ASSISTANCE_TYPE_LABELS[record.assistance_type]}</dd></div>
            ) : null}
          </dl>
        </div>
        <WeaningRecordList records={weaningRecords} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SeedstockCalvingForm
        orgId={orgId}
        locationOptions={locationOptions}
        damOptions={damOptions}
        sireOptions={sireOptions}
        record={record}
      />

      <section className="space-y-4 border-t border-border-neutral pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy">Weaning</h2>
            <p className="text-sm text-text-secondary">
              Record weaning weight and optionally register a replacement heifer
            </p>
          </div>
          {canWean && !showWeaningForm ? (
            <Button variant="secondary" onClick={() => setShowWeaningForm(true)}>
              + Record weaning
            </Button>
          ) : null}
        </div>

        <WeaningRecordList records={weaningRecords} />

        {record.calf_id ? (
          <Link
            href={`/seedstock/animals/${record.calf_id}`}
            className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
          >
            View registered calf →
          </Link>
        ) : null}

        {showWeaningForm && canWean ? (
          <WeaningForm
            orgId={orgId}
            calvingOptions={[]}
            prefilled={{
              calvingRecordId: record.id,
              damId: record.dam_id,
              calfTag: record.calf_tag,
              calfSex: record.calf_sex,
            }}
            onSuccess={() => setShowWeaningForm(false)}
          />
        ) : null}
      </section>
    </div>
  );
}
