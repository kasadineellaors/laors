"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { ProcessingEventType } from "@/lib/cow-calf/processing-types";
import { PROCESSING_EVENT_TYPE_LABELS } from "@/lib/cow-calf/constants";
import { createCowCalfProcessingEvent } from "@/lib/actions/cow-calf-processing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalfOption {
  value: string;
  label: string;
}

interface ProcessingFormProps {
  orgId: string;
  herdOptions: SelectOption[];
  locationOptions: SelectOption[];
  calfOptions: CalfOption[];
  defaultHerdId?: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function ProcessingForm({
  orgId,
  herdOptions,
  locationOptions,
  calfOptions,
  defaultHerdId,
}: ProcessingFormProps) {
  const router = useRouter();
  const [eventType, setEventType] = useState<ProcessingEventType>("birth_processing");
  const [processedAt, setProcessedAt] = useState(new Date().toISOString().slice(0, 10));
  const [herdId, setHerdId] = useState(defaultHerdId ?? "");
  const [locationId, setLocationId] = useState("");
  const [productName, setProductName] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [recordTreatment, setRecordTreatment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredCalves = useMemo(() => {
    if (!herdId) return calfOptions;
    return calfOptions;
  }, [calfOptions, herdId]);

  function toggleCalf(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createCowCalfProcessingEvent(orgId, {
      eventType,
      processedAt,
      cowCalfHerdId: herdId || undefined,
      locationId: locationId || undefined,
      productName,
      notes,
      calfIds: selected,
      recordTreatment: recordTreatment && Boolean(productName.trim()),
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/processing");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group processing</CardTitle>
        <CardDescription>
          Record branding, vaccination, castration, or birth processing for selected calves.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Event type</Label>
            <select
              className={selectClass}
              value={eventType}
              onChange={(e) => setEventType(e.target.value as ProcessingEventType)}
            >
              {(Object.keys(PROCESSING_EVENT_TYPE_LABELS) as ProcessingEventType[]).map((key) => (
                <option key={key} value={key}>{PROCESSING_EVENT_TYPE_LABELS[key]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={processedAt} onChange={(e) => setProcessedAt(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Herd</Label>
            <select className={selectClass} value={herdId} onChange={(e) => setHerdId(e.target.value)}>
              <option value="">All calves</option>
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
          <Label>Product / protocol</Label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. 7-way, blackleg, brand"
          />
        </div>

        <div>
          <Label>Calves ({selected.length} selected)</Label>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border-neutral p-2">
            {filteredCalves.length === 0 ? (
              <li className="px-2 py-4 text-center text-sm text-text-secondary">No calves at side.</li>
            ) : (
              filteredCalves.map((calf) => (
                <li key={calf.value}>
                  <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-tan/20">
                    <input
                      type="checkbox"
                      checked={selected.includes(calf.value)}
                      onChange={() => toggleCalf(calf.value)}
                      className="size-5 accent-olive"
                    />
                    <span className="text-sm font-medium text-navy">{calf.label}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-border-neutral px-3 py-3">
          <input
            type="checkbox"
            checked={recordTreatment}
            onChange={(e) => setRecordTreatment(e.target.checked)}
            className="size-5 accent-olive"
          />
          <span className="text-sm font-medium text-navy">Also log in health treatments</span>
        </label>

        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-status-critical">{error}</p> : null}

        <Button type="submit" size="lg" disabled={loading || selected.length === 0}>
          {loading ? "Saving…" : `Process ${selected.length} calf${selected.length === 1 ? "" : "ves"}`}
        </Button>
      </form>
    </Card>
  );
}
