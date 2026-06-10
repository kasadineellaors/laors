"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { BreedingRecord } from "@/lib/cow-calf/breeding-types";
import type { BreedingMethod, PregnancyStatus } from "@/lib/cow-calf/breeding-types";
import {
  BREEDING_METHOD_LABELS,
  PREGNANCY_STATUS_LABELS,
  expectedCalvingFromBredDate,
} from "@/lib/cow-calf/constants";
import { createBreeding, updateBreeding } from "@/lib/actions/breeding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalOption {
  value: string;
  label: string;
  tag: string;
}

interface SeedstockBreedingFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  sireOptions: AnimalOption[];
  damOptions: AnimalOption[];
  record?: BreedingRecord;
  defaultDamId?: string;
  defaultSireId?: string;
  onSuccess?: () => void;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border bg-surface px-3 py-2";

export function SeedstockBreedingForm({
  orgId,
  locationOptions,
  sireOptions,
  damOptions,
  record,
  defaultDamId,
  defaultSireId,
  onSuccess,
}: SeedstockBreedingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(record);

  const [bredAt, setBredAt] = useState(record?.bred_at ?? new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState(record?.location_id ?? "");
  const [damId, setDamId] = useState(record?.dam_id ?? defaultDamId ?? "");
  const [damTag, setDamTag] = useState(record?.dam_tag ?? "");
  const [bullId, setBullId] = useState(record?.bull_id ?? defaultSireId ?? "");
  const [sireTag, setSireTag] = useState(record?.sire_tag ?? "");
  const [embryoDonorTag, setEmbryoDonorTag] = useState(record?.embryo_donor_tag ?? "");
  const [embryoRecipientTag, setEmbryoRecipientTag] = useState(
    record?.embryo_recipient_tag ?? "",
  );
  const [method, setMethod] = useState<BreedingMethod>(record?.breeding_method ?? "ai");
  const [expectedCalving, setExpectedCalving] = useState(
    record?.expected_calving_date ?? expectedCalvingFromBredDate(bredAt),
  );
  const [status, setStatus] = useState<PregnancyStatus>(record?.pregnancy_status ?? "bred");
  const [checkDate, setCheckDate] = useState(record?.pregnancy_check_date ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showEmbryoFields = method === "embryo";

  function handleBredAtChange(value: string) {
    setBredAt(value);
    if (!isEdit) setExpectedCalving(expectedCalvingFromBredDate(value));
  }

  function handleDamChange(id: string) {
    setDamId(id);
    const dam = damOptions.find((d) => d.value === id);
    if (dam) setDamTag(dam.tag);
  }

  function handleSireChange(id: string) {
    setBullId(id);
    const sire = sireOptions.find((s) => s.value === id);
    if (sire) setSireTag(sire.tag);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isEdit) {
      const result = await updateBreeding(orgId, record!.id, {
        bredAt,
        locationId: locationId || null,
        damId: damId || null,
        damTag: damTag || null,
        bullId: bullId || null,
        sireTag: sireTag || null,
        embryoDonorTag: showEmbryoFields ? embryoDonorTag || null : null,
        embryoRecipientTag: showEmbryoFields ? embryoRecipientTag || null : null,
        breedingMethod: method,
        expectedCalvingDate: expectedCalving || null,
        pregnancyStatus: status,
        pregnancyCheckDate: checkDate || null,
        notes: notes || null,
      });
      setLoading(false);
      if (result.error) setError(result.error);
      else if (onSuccess) onSuccess();
      else router.refresh();
      return;
    }

    const result = await createBreeding(orgId, {
      bredAt,
      breedingContext: "seedstock",
      locationId: locationId || undefined,
      damId: damId || undefined,
      damTag,
      bullId: bullId || undefined,
      sireTag,
      embryoDonorTag: showEmbryoFields ? embryoDonorTag : undefined,
      embryoRecipientTag: showEmbryoFields ? embryoRecipientTag : undefined,
      breedingMethod: method,
      expectedCalvingDate: expectedCalving,
      pregnancyStatus: status,
      pregnancyCheckDate: checkDate || undefined,
      notes,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.breedingId) router.push(`/seedstock/breeding/${result.breedingId}`);
    else router.push("/seedstock/breeding");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit breeding" : "Record seedstock breeding"}</CardTitle>
        <CardDescription>
          AI, natural service, or embryo transfer tied to registered seedstock animals.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="bredAt">Service / bred date</Label>
          <Input
            id="bredAt"
            type="date"
            value={bredAt}
            onChange={(e) => handleBredAtChange(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as BreedingMethod)}
            className={selectClass}
          >
            {(Object.keys(BREEDING_METHOD_LABELS) as BreedingMethod[]).map((key) => (
              <option key={key} value={key}>
                {BREEDING_METHOD_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="dam">Dam (registry)</Label>
          <select
            id="dam"
            value={damId}
            onChange={(e) => handleDamChange(e.target.value)}
            className={selectClass}
          >
            <option value="">— Select or enter tag below —</option>
            {damOptions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="damTag">Dam tag (manual)</Label>
          <Input id="damTag" value={damTag} onChange={(e) => setDamTag(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="sire">Sire (registry)</Label>
          <select
            id="sire"
            value={bullId}
            onChange={(e) => handleSireChange(e.target.value)}
            className={selectClass}
          >
            <option value="">— Select or enter tag below —</option>
            {sireOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="sireTag">Sire tag (manual)</Label>
          <Input id="sireTag" value={sireTag} onChange={(e) => setSireTag(e.target.value)} />
        </div>

        {showEmbryoFields ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="embryoDonor">Embryo donor tag</Label>
              <Input
                id="embryoDonor"
                value={embryoDonorTag}
                onChange={(e) => setEmbryoDonorTag(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="embryoRecipient">Recipient tag</Label>
              <Input
                id="embryoRecipient"
                value={embryoRecipientTag}
                onChange={(e) => setEmbryoRecipientTag(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div>
          <Label htmlFor="location">Location</Label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className={selectClass}
          >
            <option value="">— Optional —</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="expectedCalving">Expected calving</Label>
          <Input
            id="expectedCalving"
            type="date"
            value={expectedCalving}
            onChange={(e) => setExpectedCalving(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="status">Pregnancy status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PregnancyStatus)}
            className={selectClass}
          >
            {(Object.keys(PREGNANCY_STATUS_LABELS) as PregnancyStatus[]).map((key) => (
              <option key={key} value={key}>
                {PREGNANCY_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="checkDate">Pregnancy check date</Label>
          <Input
            id="checkDate"
            type="date"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Record breeding"}
        </Button>
      </form>
    </Card>
  );
}
