"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWeaning } from "@/lib/actions/weaning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CalvingWeaningOption {
  value: string;
  label: string;
  damId: string | null;
  damTag: string | null;
  calfTag: string | null;
  calfSex: string;
  calvedAt: string;
}

interface WeaningFormProps {
  orgId: string;
  calvingOptions: CalvingWeaningOption[];
  defaultCalvingId?: string;
  prefilled?: {
    calvingRecordId: string;
    damId: string | null;
    calfTag: string | null;
    calfSex: string;
  };
  onSuccess?: () => void;
}

export function WeaningForm({
  orgId,
  calvingOptions,
  defaultCalvingId,
  prefilled,
  onSuccess,
}: WeaningFormProps) {
  const router = useRouter();
  const locked = Boolean(prefilled);

  const initialCalving =
    prefilled?.calvingRecordId ??
    defaultCalvingId ??
    (calvingOptions.length === 1 ? calvingOptions[0].value : "");

  const [calvingId, setCalvingId] = useState(initialCalving);
  const [calfTag, setCalfTag] = useState(
    prefilled?.calfTag ?? calvingOptions.find((c) => c.value === initialCalving)?.calfTag ?? "",
  );
  const [weanedAt, setWeanedAt] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [retained, setRetained] = useState(
    prefilled?.calfSex === "heifer_calf" || prefilled?.calfSex === "unknown",
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = calvingOptions.find((c) => c.value === calvingId) ?? (prefilled ? {
    value: prefilled.calvingRecordId,
    label: "",
    damId: prefilled.damId,
    damTag: null,
    calfTag: prefilled.calfTag,
    calfSex: prefilled.calfSex,
    calvedAt: "",
  } : null);

  function handleCalvingChange(id: string) {
    setCalvingId(id);
    const opt = calvingOptions.find((c) => c.value === id);
    if (opt?.calfTag) setCalfTag(opt.calfTag);
    if (opt?.calfSex === "heifer_calf") setRetained(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedWeight = weight.trim() ? parseFloat(weight) : undefined;
    const result = await createWeaning(orgId, {
      calvingRecordId: calvingId || prefilled?.calvingRecordId,
      damId: selected?.damId ?? prefilled?.damId ?? undefined,
      calfTag,
      weanedAt,
      weaningWeightLbs: parsedWeight,
      retainedAsHeifer: retained,
      notes,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.calfAnimalId) {
      router.push(`/seedstock/animals/${result.calfAnimalId}`);
    } else {
      router.push("/seedstock/weaning");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!locked ? (
        <div>
          <Label htmlFor="calving">From calving</Label>
          <select
            id="calving"
            className="touch-target mt-1 w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
            value={calvingId}
            onChange={(e) => handleCalvingChange(e.target.value)}
            required
          >
            <option value="">Select calving…</option>
            {calvingOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="calfTag">Calf tag</Label>
          <Input
            id="calfTag"
            value={calfTag}
            onChange={(e) => setCalfTag(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="weanedAt">Weaning date</Label>
          <Input
            id="weanedAt"
            type="date"
            value={weanedAt}
            onChange={(e) => setWeanedAt(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="weight">Weaning weight (lbs)</Label>
        <Input
          id="weight"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border-neutral bg-surface-white px-4 py-3">
        <input
          type="checkbox"
          checked={retained}
          onChange={(e) => setRetained(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-text-primary">
          <span className="font-medium">Retain as replacement heifer</span>
          <span className="mt-0.5 block text-text-secondary">
            Creates a seedstock heifer in the registry with dam and sire linked from the calving
            record.
          </span>
        </span>
      </label>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="mt-1 min-h-[80px] w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Saving…" : retained ? "Record weaning & register heifer" : "Record weaning"}
      </Button>
    </form>
  );
}

export function WeaningRecordList({
  records,
}: {
  records: Array<{
    id: string;
    weaned_at: string;
    calf_tag: string | null;
    weaning_weight_lbs: number | null;
    retained_as_heifer: boolean;
    calf_id: string | null;
  }>;
}) {
  if (!records.length) return null;

  return (
    <ul className="space-y-2">
      {records.map((w) => (
        <li
          key={w.id}
          className="flex items-center justify-between rounded-lg border border-border-neutral bg-cream px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium text-navy">{w.calf_tag ?? "Calf"}</p>
            <p className="text-text-secondary">
              {w.weaned_at}
              {w.weaning_weight_lbs != null ? ` · ${w.weaning_weight_lbs} lbs` : ""}
              {w.retained_as_heifer ? " · Retained" : ""}
            </p>
          </div>
          {w.calf_id ? (
            <Link href={`/seedstock/animals/${w.calf_id}`} className="text-brown hover:underline">
              View heifer
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
