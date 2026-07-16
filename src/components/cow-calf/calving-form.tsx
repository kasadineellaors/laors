"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { ClassificationOption, CalvingRecord, CalfSex, CalvingOutcome } from "@/lib/cow-calf/types";
import { suggestCalfClassificationId } from "@/lib/cow-calf/classifications";
import { createCalving, updateCalving } from "@/lib/actions/calving";
import { CALF_SEX_LABELS, CALVING_OUTCOME_LABELS } from "@/lib/cow-calf/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalvingFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  classificationOptions: ClassificationOption[];
  canAddToInventory?: boolean;
  record?: CalvingRecord;
  onSuccess?: () => void;
}

export function CalvingForm({
  orgId,
  locationOptions,
  groupOptions,
  classificationOptions,
  canAddToInventory = false,
  record,
  onSuccess,
}: CalvingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(record);

  const [calvedAt, setCalvedAt] = useState(record?.calved_at ?? new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState(record?.location_id ?? "");
  const [groupId, setGroupId] = useState(record?.cattle_group_id ?? "");
  const [damTag, setDamTag] = useState(record?.dam_tag ?? "");
  const [sireTag, setSireTag] = useState(record?.sire_tag ?? "");
  const [calfTag, setCalfTag] = useState(record?.calf_tag ?? "");
  const [calfSex, setCalfSex] = useState<CalfSex>(record?.calf_sex ?? "unknown");
  const [birthWeight, setBirthWeight] = useState(
    record?.birth_weight_lbs != null ? String(record.birth_weight_lbs) : "",
  );
  const [outcome, setOutcome] = useState<CalvingOutcome>(record?.outcome ?? "live");
  const [classificationId, setClassificationId] = useState(
    record?.classification_id ??
      suggestCalfClassificationId(classificationOptions, record?.calf_sex ?? "unknown"),
  );
  const [addToInventory, setAddToInventory] = useState(
    canAddToInventory && (record?.add_to_inventory ?? true),
  );
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSexChange(sex: CalfSex) {
    setCalfSex(sex);
    if (!isEdit) {
      setClassificationId(suggestCalfClassificationId(classificationOptions, sex));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedWeight = birthWeight.trim() ? parseFloat(birthWeight) : undefined;

    if (isEdit) {
      const result = await updateCalving(orgId, record!.id, {
        calvedAt,
        locationId: locationId || null,
        damTag: damTag || null,
        sireTag: sireTag || null,
        calfTag: calfTag || null,
        calfSex,
        birthWeightLbs: parsedWeight ?? null,
        outcome,
        notes: notes || null,
      });
      setLoading(false);
      if (result.error) setError(result.error);
      else if (onSuccess) onSuccess();
      else router.refresh();
      return;
    }

    const result = await createCalving(orgId, {
      calvedAt,
      locationId: locationId || undefined,
      cattleGroupId: groupId || undefined,
      damTag,
      sireTag,
      calfTag,
      calfSex,
      birthWeightLbs: parsedWeight,
      outcome,
      classificationId: classificationId || undefined,
      addToInventory: addToInventory && outcome === "live",
      notes,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.calvingId) router.push(`/cow-calf/calving/${result.calvingId}`);
    else router.push("/cow-calf/calving");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit calving" : "Log calving"}</CardTitle>
        <CardDescription>
          Record birth date, dam/calf tags, and optionally add a live calf to herd counts.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="calvedAt">Calving date</Label>
          <Input
            id="calvedAt"
            type="date"
            value={calvedAt}
            onChange={(e) => setCalvedAt(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
          >
            <option value="">— Optional —</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {!isEdit ? (
          <div>
            <Label htmlFor="group">Herd group</Label>
            <select
              id="group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
            >
              <option value="">— Optional —</option>
              {groupOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="damTag">Dam tag / ID</Label>
            <Input id="damTag" value={damTag} onChange={(e) => setDamTag(e.target.value)} placeholder="Cow #" />
          </div>
          <div>
            <Label htmlFor="sireTag">Sire tag / ID</Label>
            <Input id="sireTag" value={sireTag} onChange={(e) => setSireTag(e.target.value)} placeholder="Bull #" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="calfTag">Calf tag</Label>
            <Input id="calfTag" value={calfTag} onChange={(e) => setCalfTag(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birthWeight">Birth weight (lb)</Label>
            <Input
              id="birthWeight"
              type="number"
              min="0"
              step="0.1"
              value={birthWeight}
              onChange={(e) => setBirthWeight(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="calfSex">Calf sex</Label>
          <select
            id="calfSex"
            value={calfSex}
            onChange={(e) => handleSexChange(e.target.value as CalfSex)}
            className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
          >
            {(Object.keys(CALF_SEX_LABELS) as CalfSex[]).map((key) => (
              <option key={key} value={key}>
                {CALF_SEX_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="outcome">Outcome</Label>
          <select
            id="outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CalvingOutcome)}
            className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
          >
            {(Object.keys(CALVING_OUTCOME_LABELS) as CalvingOutcome[]).map((key) => (
              <option key={key} value={key}>
                {CALVING_OUTCOME_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        {!isEdit && canAddToInventory && outcome === "live" ? (
          <>
            <div>
              <Label htmlFor="classification">Add to inventory as</Label>
              <select
                id="classification"
                value={classificationId}
                onChange={(e) => setClassificationId(e.target.value)}
                className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
              >
                <option value="">— Select classification —</option>
                {classificationOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.short_code ? ` (${c.short_code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex touch-target items-center gap-3 rounded-lg border border-border-neutral px-3 py-3">
              <input
                type="checkbox"
                checked={addToInventory}
                onChange={(e) => setAddToInventory(e.target.checked)}
                className="size-5 accent-olive"
              />
              <span className="text-sm font-medium text-navy">
                Add 1 live calf to herd inventory
              </span>
            </label>
          </>
        ) : null}

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Record calving"}
        </Button>
      </form>
    </Card>
  );
}
