"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import { createExposure } from "@/lib/actions/exposure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalOption {
  value: string;
  label: string;
  tag: string;
}

interface ExposureFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  herdOptions: SelectOption[];
  damOptions: AnimalOption[];
  bullOptions: AnimalOption[];
  defaultHerdId?: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function CowCalfExposureForm({
  orgId,
  locationOptions,
  herdOptions,
  damOptions,
  bullOptions,
  defaultHerdId,
}: ExposureFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"herd" | "individual">("herd");
  const [exposureStart, setExposureStart] = useState(new Date().toISOString().slice(0, 10));
  const [exposureEnd, setExposureEnd] = useState("");
  const [herdId, setHerdId] = useState(defaultHerdId ?? "");
  const [exposedCowCount, setExposedCowCount] = useState("");
  const [damId, setDamId] = useState("");
  const [damTag, setDamTag] = useState("");
  const [bullId, setBullId] = useState("");
  const [sireTag, setSireTag] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setWarning(null);

    const result = await createExposure(orgId, {
      breedingContext: "cow_calf",
      cowCalfHerdId: herdId || undefined,
      exposedCowCount:
        mode === "herd" && exposedCowCount ? Number.parseInt(exposedCowCount, 10) : undefined,
      damId: mode === "individual" ? damId || undefined : undefined,
      damTag: mode === "individual" ? damTag : undefined,
      bullId: bullId || undefined,
      sireTag,
      exposureStart,
      exposureEnd: exposureEnd || undefined,
      locationId: locationId || undefined,
      notes,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else {
      if (result.warning) setWarning(result.warning);
      router.push("/cow-calf/breeding?tab=exposures");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record bull exposure</CardTitle>
        <CardDescription>
          Turn bulls in with a breeding herd or record individual dam exposure. Overlapping bull
          windows are flagged for review.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("herd")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "herd" ? "bg-navy text-surface-white" : "bg-tan/30"
            }`}
          >
            Herd turn-in
          </button>
          <button
            type="button"
            onClick={() => setMode("individual")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "individual" ? "bg-navy text-surface-white" : "bg-tan/30"
            }`}
          >
            Individual dam
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Turn-in date</Label>
            <Input
              type="date"
              value={exposureStart}
              onChange={(e) => setExposureStart(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Planned pull date</Label>
            <Input
              type="date"
              value={exposureEnd}
              onChange={(e) => setExposureEnd(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Breeding herd</Label>
          <select
            className={selectClass}
            value={herdId}
            onChange={(e) => setHerdId(e.target.value)}
          >
            <option value="">— Optional —</option>
            {herdOptions.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "herd" ? (
          <div>
            <Label>Cows exposed (head count)</Label>
            <Input
              type="number"
              min={0}
              value={exposedCowCount}
              onChange={(e) => setExposedCowCount(e.target.value)}
              placeholder="e.g. 42"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Dam</Label>
              <select
                className={selectClass}
                value={damId}
                onChange={(e) => {
                  setDamId(e.target.value);
                  const opt = damOptions.find((d) => d.value === e.target.value);
                  if (opt) setDamTag(opt.tag);
                }}
              >
                <option value="">Select…</option>
                {damOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Dam tag (manual)</Label>
              <Input value={damTag} onChange={(e) => setDamTag(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Bull</Label>
            <select
              className={selectClass}
              value={bullId}
              onChange={(e) => {
                setBullId(e.target.value);
                const opt = bullOptions.find((s) => s.value === e.target.value);
                if (opt) setSireTag(opt.tag);
              }}
            >
              <option value="">Select…</option>
              {bullOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
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
          <select
            className={selectClass}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">—</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Notes</Label>
          <textarea
            className={`${selectClass} min-h-[80px]`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-status-critical">{error}</p> : null}
        {warning ? <p className="text-sm text-amber-700">{warning}</p> : null}

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Saving…" : "Record exposure"}
        </Button>
      </form>
    </Card>
  );
}
