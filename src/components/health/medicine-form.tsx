"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MedicineItemRecord } from "@/lib/medicine/types";
import { createMedicineItem, updateMedicineItem } from "@/lib/actions/medicine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MedicineFormProps {
  orgId: string;
  item?: MedicineItemRecord;
  onSuccess?: () => void;
}

export function MedicineForm({ orgId, item, onSuccess }: MedicineFormProps) {
  const router = useRouter();
  const isEdit = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "dose");
  const [quantityOnHand, setQuantityOnHand] = useState(
    item != null ? String(item.quantity_on_hand) : "0",
  );
  const [reorderAt, setReorderAt] = useState(
    item?.reorder_at != null ? String(item.reorder_at) : "",
  );
  const [pricePerCc, setPricePerCc] = useState(
    item?.price_per_cc != null ? String(item.price_per_cc) : "",
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
    const price = pricePerCc.trim() ? parseFloat(pricePerCc) : undefined;

    if (!isEdit && (Number.isNaN(qty) || qty < 0)) {
      setError("Enter a valid starting quantity");
      setLoading(false);
      return;
    }
    if (reorderAt.trim() && (Number.isNaN(reorder!) || reorder! < 0)) {
      setError("Enter a valid reorder level");
      setLoading(false);
      return;
    }

    if (pricePerCc.trim() && (Number.isNaN(price!) || price! < 0)) {
      setError("Enter a valid price per cc");
      setLoading(false);
      return;
    }

    const result = isEdit
      ? await updateMedicineItem(orgId, item!.id, {
          name,
          unit,
          reorderAt: reorderAt.trim() ? reorder! : null,
          pricePerCc: pricePerCc.trim() ? price! : null,
          notes: notes || null,
        })
      : await createMedicineItem(orgId, {
          name,
          unit,
          quantityOnHand: qty,
          reorderAt: reorder,
          pricePerCc: price,
          notes: notes || undefined,
        });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.itemId) router.push(`/health/medicine/${result.itemId}`);
    else router.push("/health/medicine");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit medicine" : "Add medicine"}</CardTitle>
        <CardDescription>Catalog pricing and on-hand inventory for treatments</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Long Range, Cydectin"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="dose, ml, bottle"
            />
          </div>
          {!isEdit ? (
            <div>
              <Label htmlFor="qty">Starting qty</Label>
              <Input
                id="qty"
                type="number"
                min={0}
                step="0.01"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
          ) : null}
        </div>
        <div>
          <Label htmlFor="pricePerCc">Price per cc ($)</Label>
          <Input
            id="pricePerCc"
            type="number"
            min={0}
            step="0.0001"
            value={pricePerCc}
            onChange={(e) => setPricePerCc(e.target.value)}
            placeholder="Catalog rate for invoicing"
          />
        </div>
        <div>
          <Label htmlFor="reorder">Reorder at (optional)</Label>
          <Input
            id="reorder"
            type="number"
            min={0}
            step="0.01"
            value={reorderAt}
            onChange={(e) => setReorderAt(e.target.value)}
            placeholder="Alert when at or below"
          />
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
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add medicine"}
        </Button>
      </form>
    </Card>
  );
}
