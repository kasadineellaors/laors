"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { RainfallRecord } from "@/lib/weather/types";
import { createRainfallRecord, updateRainfallRecord } from "@/lib/actions/weather";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RainfallFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  record?: RainfallRecord;
  onSuccess?: () => void;
}

export function RainfallForm({ orgId, locationOptions, record, onSuccess }: RainfallFormProps) {
  const router = useRouter();
  const isEdit = Boolean(record);

  const [amount, setAmount] = useState(
    record != null ? String(record.amount_inches) : "",
  );
  const [recordedDate, setRecordedDate] = useState(
    record?.recorded_date ?? new Date().toISOString().slice(0, 10),
  );
  const [locationId, setLocationId] = useState(record?.location_id ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Enter a valid amount in inches");
      setLoading(false);
      return;
    }

    const result = isEdit
      ? await updateRainfallRecord(orgId, record!.id, {
          amountInches: parsed,
          recordedDate,
          locationId: locationId || null,
          notes: notes || null,
        })
      : await createRainfallRecord(orgId, {
          amountInches: parsed,
          recordedDate,
          locationId: locationId || undefined,
          notes: notes || undefined,
        });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.recordId) router.push(`/weather/rainfall/${result.recordId}`);
    else router.push("/weather/rainfall");
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit rainfall" : "Log rainfall"}</CardTitle>
        <CardDescription>How much rain fell?</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Inches</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.75"
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              required
            />
          </div>
        </div>
        {locationOptions.length > 0 ? (
          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={selectClass}
            >
              <option value="">Ranch-wide</option>
              {locationOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
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
          {loading ? "Saving…" : isEdit ? "Save changes" : "Log rainfall"}
        </Button>
      </form>
    </Card>
  );
}
