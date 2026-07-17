"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedItemRecord } from "@/lib/feed/inventory-types";
import { createFeedItem, updateFeedItem } from "@/lib/actions/feed-inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const UNIT_OPTIONS = ["ton", "lb", "bag", "bale", "flake", "gallon"];

interface FeedItemFormProps {
  orgId: string;
  item?: FeedItemRecord;
  onSuccess?: () => void;
}

export function FeedItemForm({ orgId, item, onSuccess }: FeedItemFormProps) {
  const router = useRouter();
  const isEdit = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "ton");
  const [quantityOnHand, setQuantityOnHand] = useState(
    item != null ? String(item.quantity_on_hand) : "0",
  );
  const [reorderAt, setReorderAt] = useState(
    item?.reorder_at != null ? String(item.reorder_at) : "",
  );
  const [pricePerUnit, setPricePerUnit] = useState(
    item?.price_per_unit != null ? String(item.price_per_unit) : "",
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const qty = parseFloat(quantityOnHand);
    const reorder = reorderAt.trim() ? parseFloat(reorderAt) : undefined;
    const price = pricePerUnit.trim() ? parseFloat(pricePerUnit) : undefined;

    if (Number.isNaN(qty) || qty < 0) {
      setError("Enter a valid quantity on hand");
      setLoading(false);
      return;
    }

    const result = isEdit
      ? await updateFeedItem(orgId, item!.id, {
          name,
          unit,
          quantityOnHand: qty,
          reorderAt: reorderAt.trim() ? reorder! : null,
          pricePerUnit: pricePerUnit.trim() ? price! : null,
          notes: notes || null,
        })
      : await createFeedItem(orgId, {
          name,
          unit,
          quantityOnHand: qty,
          reorderAt: reorder,
          pricePerUnit: price,
          notes: notes || undefined,
        });

    setLoading(false);
    if (result.error) setError(result.error);
    else if (onSuccess) onSuccess();
    else if (result.itemId) router.push(`/feed/inventory/${result.itemId}`);
    else router.push("/feed/inventory");
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit feedstuff" : "Add feedstuff"}</CardTitle>
        <CardDescription>
          Track hay, grain, supplement, and mineral on hand — used when building rations.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Corn, alfalfa hay, mineral"
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
            <Label htmlFor="qty">{isEdit ? "Amount on hand" : "Starting on hand"}</Label>
            <Input
              id="qty"
              type="number"
              min={0}
              step="0.01"
              value={quantityOnHand}
              onChange={(e) => setQuantityOnHand(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="reorder">Alert when below</Label>
            <Input
              id="reorder"
              type="number"
              min={0}
              step="0.01"
              value={reorderAt}
              onChange={(e) => setReorderAt(e.target.value)}
              placeholder="Low-stock alert"
            />
          </div>
          <div>
            <Label htmlFor="price">Cost per unit ($)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.0001"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              placeholder="Optional"
            />
          </div>
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
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add feedstuff"}
        </Button>
      </form>
    </Card>
  );
}
