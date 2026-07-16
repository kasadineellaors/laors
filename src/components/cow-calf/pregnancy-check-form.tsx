"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PregnancyStatus } from "@/lib/cow-calf/breeding-types";
import { PREGNANCY_STATUS_LABELS } from "@/lib/cow-calf/constants";
import { recordPregnancyCheck } from "@/lib/actions/breeding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CHECK_STATUSES: PregnancyStatus[] = ["bred", "confirmed", "open", "recheck", "unknown"];

interface PregnancyCheckFormProps {
  orgId: string;
  breedingId: string;
  damLabel?: string | null;
  onSuccess?: () => void;
}

export function PregnancyCheckForm({
  orgId,
  breedingId,
  damLabel,
  onSuccess,
}: PregnancyCheckFormProps) {
  const router = useRouter();
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<PregnancyStatus>("bred");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await recordPregnancyCheck(orgId, breedingId, {
      pregnancyStatus: status,
      pregnancyCheckDate: checkDate,
      notes: notes || undefined,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else if (onSuccess) onSuccess();
    else router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record pregnancy check</CardTitle>
        <CardDescription>
          {damLabel ? `Check result for ${damLabel}.` : "Record ultrasound or palpation result."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="checkDate">Check date</Label>
          <Input
            id="checkDate"
            type="date"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="status">Result</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PregnancyStatus)}
            className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
          >
            {CHECK_STATUSES.map((key) => (
              <option key={key} value={key}>
                {PREGNANCY_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Saving…" : "Save check result"}
        </Button>
      </form>
    </Card>
  );
}
