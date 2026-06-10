"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedRationRecord } from "@/lib/feed/types";
import { createFeedRation, updateFeedRation } from "@/lib/actions/feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const UNIT_OPTIONS = ["ton", "lb", "bag", "bale", "flake"];

interface RationFormProps {
  orgId: string;
  ration?: FeedRationRecord;
  onSuccess?: () => void;
}

export function RationForm({ orgId, ration, onSuccess }: RationFormProps) {
  const router = useRouter();
  const isEdit = Boolean(ration);

  const [name, setName] = useState(ration?.name ?? "");
  const [unit, setUnit] = useState(ration?.unit ?? "ton");
  const [pricePerUnit, setPricePerUnit] = useState(
    ration?.price_per_unit != null ? String(ration.price_per_unit) : "",
  );
  const [notes, setNotes] = useState(ration?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const price = pricePerUnit.trim() ? parseFloat(pricePerUnit) : undefined;
    if (pricePerUnit.trim() && (Number.isNaN(price!) || price! < 0)) {
      setError("Enter a valid price");
      setLoading(false);
      return;
    }

    const result = isEdit
      ? await updateFeedRation(orgId, ration!.id, {
          name,
          unit,
          pricePerUnit: pricePerUnit.trim() ? price! : null,
          notes: notes || null,
        })
      : await createFeedRation(orgId, {
          name,
          unit,
          pricePerUnit: price,
          notes: notes || undefined,
        });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.rationId) router.push(`/feed/rations/${result.rationId}`);
    else router.push("/feed/rations");
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit ration" : "New feed ration"}</CardTitle>
        <CardDescription>Name, unit, and price per unit for billing</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Ration name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Grower mix, hay, supplement"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="unit">Unit</Label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={selectClass}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="price">Price per unit ($)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.0001"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              placeholder="For invoicing"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create ration"}
        </Button>
      </form>
    </Card>
  );
}
