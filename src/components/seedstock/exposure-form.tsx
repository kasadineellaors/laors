"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import { createExposure } from "@/lib/actions/exposure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AnimalOption {
  value: string;
  label: string;
  tag: string;
}

interface ExposureFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  damOptions: AnimalOption[];
  sireOptions: AnimalOption[];
  defaultDamId?: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function ExposureForm({
  orgId,
  locationOptions,
  damOptions,
  sireOptions,
  defaultDamId,
}: ExposureFormProps) {
  const router = useRouter();
  const [exposureStart, setExposureStart] = useState(new Date().toISOString().slice(0, 10));
  const [exposureEnd, setExposureEnd] = useState("");
  const [damId, setDamId] = useState(defaultDamId ?? "");
  const [damTag, setDamTag] = useState("");
  const [bullId, setBullId] = useState("");
  const [sireTag, setSireTag] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createExposure(orgId, {
      damId: damId || undefined,
      damTag,
      bullId: bullId || undefined,
      sireTag,
      exposureStart,
      exposureEnd: exposureEnd || undefined,
      locationId: locationId || undefined,
      notes,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/seedstock/exposure");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Exposure start</Label>
          <Input type="date" value={exposureStart} onChange={(e) => setExposureStart(e.target.value)} required />
        </div>
        <div>
          <Label>Exposure end</Label>
          <Input type="date" value={exposureEnd} onChange={(e) => setExposureEnd(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Dam</Label>
          <select className={selectClass} value={damId} onChange={(e) => {
            setDamId(e.target.value);
            const opt = damOptions.find((d) => d.value === e.target.value);
            if (opt) setDamTag(opt.tag);
          }}>
            <option value="">Select…</option>
            {damOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Bull</Label>
          <select className={selectClass} value={bullId} onChange={(e) => {
            setBullId(e.target.value);
            const opt = sireOptions.find((s) => s.value === e.target.value);
            if (opt) setSireTag(opt.tag);
          }}>
            <option value="">Select…</option>
            {sireOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
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
      <div>
        <Label>Notes</Label>
        <textarea className={`${selectClass} min-h-[80px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-status-critical">{error}</p> : null}
      <Button type="submit" size="lg" disabled={loading}>{loading ? "Saving…" : "Record exposure"}</Button>
    </form>
  );
}
