"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { AssistanceType, CalfSex, CalvingOutcome, LossCause } from "@/lib/cow-calf/types";
import {
  ASSISTANCE_TYPE_LABELS,
  CALF_SEX_LABELS,
  CALVING_EASE_SCORE_LABELS,
  CALVING_OUTCOME_LABELS,
  CALVING_LOSS_CAUSE_LABELS,
} from "@/lib/cow-calf/constants";
import { saveCowCalfCalving } from "@/lib/actions/cow-calf-calving";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DamOption {
  value: string;
  label: string;
  tag: string;
}

interface BullOption {
  value: string;
  label: string;
  tag: string;
}

interface BreedingOption {
  value: string;
  label: string;
  sireTag: string | null;
}

interface CalfDraft {
  calfTag: string;
  calfSex: CalfSex;
  birthWeight: string;
  outcome: CalvingOutcome;
  earTag: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

function emptyCalf(): CalfDraft {
  return { calfTag: "", calfSex: "unknown", birthWeight: "", outcome: "live", earTag: "" };
}

interface EnterpriseCalvingFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  herdOptions: SelectOption[];
  damOptions: DamOption[];
  bullOptions: BullOption[];
  defaultHerdId?: string;
}

export function EnterpriseCalvingForm({
  orgId,
  locationOptions,
  herdOptions,
  damOptions,
  bullOptions,
  defaultHerdId,
}: EnterpriseCalvingFormProps) {
  const router = useRouter();
  const [calvedAt, setCalvedAt] = useState(new Date().toISOString().slice(0, 10));
  const [herdId, setHerdId] = useState(defaultHerdId ?? "");
  const [locationId, setLocationId] = useState("");
  const [damId, setDamId] = useState("");
  const [bullId, setBullId] = useState("");
  const [sireTag, setSireTag] = useState("");
  const [breedingRecordId, setBreedingRecordId] = useState("");
  const [easeScore, setEaseScore] = useState("");
  const [assistance, setAssistance] = useState<AssistanceType>("unassisted");
  const [lossCause, setLossCause] = useState<LossCause>("unknown");
  const [fostered, setFostered] = useState(false);
  const [notes, setNotes] = useState("");
  const [twins, setTwins] = useState(false);
  const [calves, setCalves] = useState<CalfDraft[]>([emptyCalf()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateCalf(index: number, patch: Partial<CalfDraft>) {
    setCalves((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function handleTwinToggle(enabled: boolean) {
    setTwins(enabled);
    setCalves(enabled ? [emptyCalf(), emptyCalf()] : [emptyCalf()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!damId) {
      setError("Select a dam");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await saveCowCalfCalving(orgId, {
      calvedAt,
      cowCalfHerdId: herdId || undefined,
      locationId: locationId || undefined,
      damId,
      bullId: bullId || undefined,
      sireTag,
      breedingRecordId: breedingRecordId || undefined,
      calvingEaseScore: easeScore ? Number.parseInt(easeScore, 10) : undefined,
      assistanceType: assistance,
      lossCause,
      fostered,
      notes,
      calves: calves.map((c) => ({
        calfTag: c.calfTag || undefined,
        calfSex: c.calfSex,
        birthWeightLbs: c.birthWeight ? Number.parseFloat(c.birthWeight) : undefined,
        outcome: c.outcome,
        earTag: c.earTag || undefined,
      })),
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.calvingIds?.[0]) router.push(`/cow-calf/calving/${result.calvingIds[0]}`);
    else router.push("/cow-calf/calving");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record calving</CardTitle>
        <CardDescription>
          Select the dam, record calf details, and automatically link calves at side for pair counts.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Calving date</Label>
            <Input type="date" value={calvedAt} onChange={(e) => setCalvedAt(e.target.value)} required />
          </div>
          <div>
            <Label>Breeding herd</Label>
            <select className={selectClass} value={herdId} onChange={(e) => setHerdId(e.target.value)}>
              <option value="">— From dam —</option>
              {herdOptions.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Dam *</Label>
          <select
            className={selectClass}
            value={damId}
            onChange={(e) => setDamId(e.target.value)}
            required
          >
            <option value="">Select dam…</option>
            {damOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Bull / sire</Label>
            <select
              className={selectClass}
              value={bullId}
              onChange={(e) => {
                setBullId(e.target.value);
                const bull = bullOptions.find((b) => b.value === e.target.value);
                if (bull) setSireTag(bull.tag);
              }}
            >
              <option value="">— Optional —</option>
              {bullOptions.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Sire tag (manual)</Label>
            <Input value={sireTag} onChange={(e) => setSireTag(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Location</Label>
          <select className={selectClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">— Optional —</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Calving ease</Label>
            <select className={selectClass} value={easeScore} onChange={(e) => setEaseScore(e.target.value)}>
              <option value="">—</option>
              {Object.entries(CALVING_EASE_SCORE_LABELS).map(([score, label]) => (
                <option key={score} value={score}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Assistance</Label>
            <select
              className={selectClass}
              value={assistance}
              onChange={(e) => setAssistance(e.target.value as AssistanceType)}
            >
              {(Object.keys(ASSISTANCE_TYPE_LABELS) as AssistanceType[]).map((key) => (
                <option key={key} value={key}>{ASSISTANCE_TYPE_LABELS[key]}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-border-neutral px-3 py-3">
          <input
            type="checkbox"
            checked={twins}
            onChange={(e) => handleTwinToggle(e.target.checked)}
            className="size-5 accent-olive"
          />
          <span className="text-sm font-medium text-navy">Twin / multiple calves</span>
        </label>

        {calves.map((calf, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-border-neutral bg-tan/10 p-4">
            <p className="font-semibold text-navy">
              Calf {calves.length > 1 ? index + 1 : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Calf tag / ID</Label>
                <Input
                  value={calf.calfTag}
                  onChange={(e) => updateCalf(index, { calfTag: e.target.value })}
                  placeholder="Auto-generated if blank"
                />
              </div>
              <div>
                <Label>Ear tag</Label>
                <Input value={calf.earTag} onChange={(e) => updateCalf(index, { earTag: e.target.value })} />
              </div>
              <div>
                <Label>Sex</Label>
                <select
                  className={selectClass}
                  value={calf.calfSex}
                  onChange={(e) => updateCalf(index, { calfSex: e.target.value as CalfSex })}
                >
                  {(Object.keys(CALF_SEX_LABELS) as CalfSex[]).map((key) => (
                    <option key={key} value={key}>{CALF_SEX_LABELS[key]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Birth weight (lb)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={calf.birthWeight}
                  onChange={(e) => updateCalf(index, { birthWeight: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Outcome</Label>
                <select
                  className={selectClass}
                  value={calf.outcome}
                  onChange={(e) => updateCalf(index, { outcome: e.target.value as CalvingOutcome })}
                >
                  {(Object.keys(CALVING_OUTCOME_LABELS) as CalvingOutcome[]).map((key) => (
                    <option key={key} value={key}>{CALVING_OUTCOME_LABELS[key]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        {calves.some((c) => c.outcome !== "live") ? (
          <div>
            <Label>Loss cause</Label>
            <select
              className={selectClass}
              value={lossCause}
              onChange={(e) => setLossCause(e.target.value as LossCause)}
            >
              {(Object.keys(CALVING_LOSS_CAUSE_LABELS) as LossCause[]).map((key) => (
                <option key={key} value={key}>{CALVING_LOSS_CAUSE_LABELS[key]}</option>
              ))}
            </select>
          </div>
        ) : null}

        <label className="flex items-center gap-3 rounded-lg border border-border-neutral px-3 py-3">
          <input
            type="checkbox"
            checked={fostered}
            onChange={(e) => setFostered(e.target.checked)}
            className="size-5 accent-olive"
          />
          <span className="text-sm font-medium text-navy">Fostered calf (no dam–calf pair link)</span>
        </label>

        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-status-critical">{error}</p> : null}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : "Record calving"}
        </Button>
      </form>
    </Card>
  );
}
