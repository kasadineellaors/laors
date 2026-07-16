"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { LossCause } from "@/lib/cow-calf/exit-types";
import { LOSS_CAUSE_LABELS } from "@/lib/cow-calf/constants";
import { saveCowCalfLoss } from "@/lib/actions/cow-calf-loss";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalOption {
  value: string;
  label: string;
}

interface LossFormProps {
  orgId: string;
  herdOptions: SelectOption[];
  locationOptions: SelectOption[];
  animalOptions: AnimalOption[];
  defaultAnimalId?: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function CowCalfLossForm({
  orgId,
  herdOptions,
  locationOptions,
  animalOptions,
  defaultAnimalId,
}: LossFormProps) {
  const router = useRouter();
  const [animalId, setAnimalId] = useState(defaultAnimalId ?? "");
  const [lossDate, setLossDate] = useState(new Date().toISOString().slice(0, 10));
  const [cause, setCause] = useState<LossCause>("unknown");
  const [herdId, setHerdId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [disposal, setDisposal] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!animalId) {
      setError("Select an animal");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await saveCowCalfLoss(orgId, {
      animalId,
      lossDate,
      cause,
      cowCalfHerdId: herdId || undefined,
      locationId: locationId || undefined,
      disposalMethod: disposal,
      notes,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/loss");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record death or loss</CardTitle>
        <CardDescription>
          Marks the animal deceased, ends nursing pairs, and preserves a loss record for the ranch.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Animal *</Label>
          <select className={selectClass} value={animalId} onChange={(e) => setAnimalId(e.target.value)} required>
            <option value="">Select…</option>
            {animalOptions.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" value={lossDate} onChange={(e) => setLossDate(e.target.value)} required />
          </div>
          <div>
            <Label>Cause</Label>
            <select className={selectClass} value={cause} onChange={(e) => setCause(e.target.value as LossCause)}>
              {(Object.keys(LOSS_CAUSE_LABELS) as LossCause[]).map((key) => (
                <option key={key} value={key}>{LOSS_CAUSE_LABELS[key]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Herd</Label>
            <select className={selectClass} value={herdId} onChange={(e) => setHerdId(e.target.value)}>
              <option value="">—</option>
              {herdOptions.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Location</Label>
            <select className={selectClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">—</option>
              {locationOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Disposal</Label>
          <Input value={disposal} onChange={(e) => setDisposal(e.target.value)} placeholder="Burial, rendering, etc." />
        </div>

        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-status-critical">{error}</p> : null}

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Saving…" : "Record loss"}
        </Button>
      </form>
    </Card>
  );
}
