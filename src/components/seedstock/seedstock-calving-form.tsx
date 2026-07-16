"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type {
  AssistanceType,
  CalvingRecord,
  CalfSex,
  CalvingOutcome,
  LossCause,
} from "@/lib/cow-calf/types";
import {
  ASSISTANCE_TYPE_LABELS,
  CALF_SEX_LABELS,
  CALVING_EASE_SCORE_LABELS,
  CALVING_OUTCOME_LABELS,
  LOSS_CAUSE_LABELS,
} from "@/lib/cow-calf/constants";
import { createCalving, updateCalving } from "@/lib/actions/calving";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AnimalOption {
  value: string;
  label: string;
  tag: string;
}

interface SeedstockCalvingFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  damOptions: AnimalOption[];
  sireOptions: AnimalOption[];
  defaultDamId?: string;
  record?: CalvingRecord;
  onSuccess?: () => void;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function SeedstockCalvingForm({
  orgId,
  locationOptions,
  damOptions,
  sireOptions,
  defaultDamId,
  record,
  onSuccess,
}: SeedstockCalvingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(record);

  const [calvedAt, setCalvedAt] = useState(record?.calved_at ?? new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState(record?.location_id ?? "");
  const [damId, setDamId] = useState(record?.dam_id ?? defaultDamId ?? "");
  const [damTag, setDamTag] = useState(record?.dam_tag ?? "");
  const [bullId, setBullId] = useState(record?.bull_id ?? "");
  const [sireTag, setSireTag] = useState(record?.sire_tag ?? "");
  const [calfTag, setCalfTag] = useState(record?.calf_tag ?? "");
  const [calfSex, setCalfSex] = useState<CalfSex>(record?.calf_sex ?? "unknown");
  const [birthWeight, setBirthWeight] = useState(
    record?.birth_weight_lbs != null ? String(record.birth_weight_lbs) : "",
  );
  const [outcome, setOutcome] = useState<CalvingOutcome>(record?.outcome ?? "live");
  const [easeScore, setEaseScore] = useState(
    record?.calving_ease_score != null ? String(record.calving_ease_score) : "",
  );
  const [assistance, setAssistance] = useState<AssistanceType>(
    record?.assistance_type ?? "unassisted",
  );
  const [lossCause, setLossCause] = useState<LossCause>(record?.loss_cause ?? "unknown");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleDamChange(id: string) {
    setDamId(id);
    const opt = damOptions.find((d) => d.value === id);
    if (opt) setDamTag(opt.tag);
  }

  function handleSireChange(id: string) {
    setBullId(id);
    const opt = sireOptions.find((s) => s.value === id);
    if (opt) setSireTag(opt.tag);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const weight = birthWeight.trim() ? parseFloat(birthWeight) : undefined;
    const ease = easeScore.trim() ? parseInt(easeScore, 10) : undefined;

    if (isEdit) {
      const result = await updateCalving(orgId, record!.id, {
        calvedAt,
        locationId: locationId || null,
        damId: damId || null,
        damTag: damTag || null,
        bullId: bullId || null,
        sireTag: sireTag || null,
        calfTag: calfTag || null,
        calfSex,
        birthWeightLbs: weight ?? null,
        outcome,
        calvingEaseScore: ease ?? null,
        assistanceType: assistance,
        lossCause: outcome === "live" ? null : lossCause,
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
      calvingContext: "seedstock",
      locationId: locationId || undefined,
      damId: damId || undefined,
      damTag,
      bullId: bullId || undefined,
      sireTag,
      calfTag,
      calfSex,
      birthWeightLbs: weight,
      outcome,
      calvingEaseScore: ease,
      assistanceType: assistance,
      lossCause: outcome === "live" ? undefined : lossCause,
      notes,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else if (onSuccess) onSuccess();
    else if (result.calvingId) router.push(`/seedstock/calving/${result.calvingId}`);
    else router.push("/seedstock/calving");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="calvedAt">Calving date</Label>
          <Input id="calvedAt" type="date" value={calvedAt} onChange={(e) => setCalvedAt(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <select id="location" className={selectClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">—</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="dam">Dam (registry)</Label>
          <select id="dam" className={selectClass} value={damId} onChange={(e) => handleDamChange(e.target.value)}>
            <option value="">Select dam…</option>
            {damOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="sire">Sire</Label>
          <select id="sire" className={selectClass} value={bullId} onChange={(e) => handleSireChange(e.target.value)}>
            <option value="">Select or enter below…</option>
            {sireOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Input className="mt-2" placeholder="Sire tag (AI / outside bull)" value={sireTag} onChange={(e) => setSireTag(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="calfTag">Calf tag</Label>
          <Input id="calfTag" value={calfTag} onChange={(e) => setCalfTag(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sex">Calf sex</Label>
          <select id="sex" className={selectClass} value={calfSex} onChange={(e) => setCalfSex(e.target.value as CalfSex)}>
            {(Object.keys(CALF_SEX_LABELS) as CalfSex[]).map((k) => (
              <option key={k} value={k}>{CALF_SEX_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="bw">Birth weight (lbs)</Label>
          <Input id="bw" inputMode="decimal" value={birthWeight} onChange={(e) => setBirthWeight(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="outcome">Outcome</Label>
          <select id="outcome" className={selectClass} value={outcome} onChange={(e) => setOutcome(e.target.value as CalvingOutcome)}>
            {(Object.keys(CALVING_OUTCOME_LABELS) as CalvingOutcome[]).map((k) => (
              <option key={k} value={k}>{CALVING_OUTCOME_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ease">Calving ease (1–5)</Label>
          <select id="ease" className={selectClass} value={easeScore} onChange={(e) => setEaseScore(e.target.value)}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{CALVING_EASE_SCORE_LABELS[n]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="assist">Assistance</Label>
          <select id="assist" className={selectClass} value={assistance} onChange={(e) => setAssistance(e.target.value as AssistanceType)}>
            {(Object.keys(ASSISTANCE_TYPE_LABELS) as Array<keyof typeof ASSISTANCE_TYPE_LABELS>).map((k) => (
              <option key={k} value={k}>{ASSISTANCE_TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {outcome !== "live" ? (
        <div>
          <Label htmlFor="loss">Loss cause</Label>
          <select id="loss" className={selectClass} value={lossCause} onChange={(e) => setLossCause(e.target.value as LossCause)}>
            {(Object.keys(LOSS_CAUSE_LABELS) as Array<keyof typeof LOSS_CAUSE_LABELS>).map((k) => (
              <option key={k} value={k}>{LOSS_CAUSE_LABELS[k]}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className={`${selectClass} min-h-[80px]`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-status-critical" role="alert">{error}</p> : null}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Saving…" : isEdit ? "Save calving" : "Record calving"}
      </Button>
    </form>
  );
}
