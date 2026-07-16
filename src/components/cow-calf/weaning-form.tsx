"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { WeaningMethod } from "@/lib/cow-calf/exit-types";
import { WEANING_METHOD_LABELS } from "@/lib/cow-calf/constants";
import { saveCowCalfWeaning } from "@/lib/actions/cow-calf-weaning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalfOption {
  value: string;
  label: string;
  herdId: string | null;
}

interface WeaningFormProps {
  orgId: string;
  herdOptions: SelectOption[];
  locationOptions: SelectOption[];
  calfOptions: CalfOption[];
  defaultHerdId?: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function CowCalfWeaningForm({
  orgId,
  herdOptions,
  locationOptions,
  calfOptions,
  defaultHerdId,
}: WeaningFormProps) {
  const router = useRouter();
  const [weanedAt, setWeanedAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<WeaningMethod>("traditional");
  const [herdId, setHerdId] = useState(defaultHerdId ?? "");
  const [destinationHerdId, setDestinationHerdId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [retained, setRetained] = useState<Record<string, boolean>>({});
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredCalves = useMemo(() => {
    if (!herdId) return calfOptions;
    return calfOptions.filter((c) => c.herdId === herdId);
  }, [calfOptions, herdId]);

  function toggleCalf(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await saveCowCalfWeaning(orgId, {
      weanedAt,
      weaningMethod: method,
      cowCalfHerdId: herdId || undefined,
      destinationHerdId: destinationHerdId || undefined,
      destinationLocationId: destinationLocationId || undefined,
      notes,
      calves: selected.map((calfId) => ({
        calfId,
        weaningWeightLbs: weights[calfId] ? Number.parseFloat(weights[calfId]) : undefined,
        retainedAsReplacement: retained[calfId] ?? false,
      })),
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/weaning");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wean calves</CardTitle>
        <CardDescription>
          Ends nursing pairs, updates dam status, and moves calves to destination herd or location.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Weaning date</Label>
            <Input type="date" value={weanedAt} onChange={(e) => setWeanedAt(e.target.value)} required />
          </div>
          <div>
            <Label>Method</Label>
            <select className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as WeaningMethod)}>
              {(Object.keys(WEANING_METHOD_LABELS) as WeaningMethod[]).map((key) => (
                <option key={key} value={key}>{WEANING_METHOD_LABELS[key]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Source herd</Label>
            <select className={selectClass} value={herdId} onChange={(e) => setHerdId(e.target.value)}>
              <option value="">All herds</option>
              {herdOptions.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Destination herd</Label>
            <select className={selectClass} value={destinationHerdId} onChange={(e) => setDestinationHerdId(e.target.value)}>
              <option value="">— Same / none —</option>
              {herdOptions.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Destination location</Label>
          <select className={selectClass} value={destinationLocationId} onChange={(e) => setDestinationLocationId(e.target.value)}>
            <option value="">—</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>Calves to wean ({selected.length})</Label>
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border-neutral p-2">
            {filteredCalves.length === 0 ? (
              <li className="px-2 py-4 text-center text-sm text-text-secondary">No calves at side.</li>
            ) : (
              filteredCalves.map((calf) => (
                <li key={calf.value} className="rounded-lg border border-border-neutral/60 p-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(calf.value)}
                      onChange={() => toggleCalf(calf.value)}
                      className="size-5 accent-olive"
                    />
                    <span className="text-sm font-medium text-navy">{calf.label}</span>
                  </label>
                  {selected.includes(calf.value) ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Input
                        type="number"
                        placeholder="Weaning weight (lb)"
                        value={weights[calf.value] ?? ""}
                        onChange={(e) => setWeights((w) => ({ ...w, [calf.value]: e.target.value }))}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={retained[calf.value] ?? false}
                          onChange={(e) => setRetained((r) => ({ ...r, [calf.value]: e.target.checked }))}
                          className="size-4 accent-olive"
                        />
                        Retain as replacement
                      </label>
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-status-critical">{error}</p> : null}

        <Button type="submit" size="lg" disabled={loading || selected.length === 0}>
          {loading ? "Saving…" : `Wean ${selected.length} calf${selected.length === 1 ? "" : "ves"}`}
        </Button>
      </form>
    </Card>
  );
}
