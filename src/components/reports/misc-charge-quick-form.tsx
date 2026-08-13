"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnerRecord } from "@/lib/owners/types";
import { createOwnerMiscCharge } from "@/lib/actions/owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MiscChargeQuickFormProps {
  orgId: string;
  ownerOptions: OwnerRecord[];
  lotOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; label: string }>;
  defaultOwnerId?: string;
  defaultLotId?: string;
  defaultLocationId?: string;
  onSaved?: () => void;
}

export function MiscChargeQuickForm({
  orgId,
  ownerOptions,
  lotOptions,
  locationOptions,
  defaultOwnerId,
  defaultLotId,
  defaultLocationId,
  onSaved,
}: MiscChargeQuickFormProps) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(defaultOwnerId ?? "");
  const [lotId, setLotId] = useState(defaultLotId ?? "");
  const [locationId, setLocationId] = useState(defaultLocationId ?? "");
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  useEffect(() => {
    if (quantity.trim() && unitCost.trim()) {
      const q = parseFloat(quantity);
      const u = parseFloat(unitCost);
      if (!Number.isNaN(q) && !Number.isNaN(u)) {
        setAmount(String(Math.round(q * u * 100) / 100));
      }
    }
  }, [quantity, unitCost]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) {
      setError("Select an owner");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createOwnerMiscCharge(orgId, {
      ownerId,
      cattleGroupId: lotId || undefined,
      locationId: locationId || undefined,
      chargeDate,
      description,
      amount,
      quantity: quantity || undefined,
      unitCost: unitCost || undefined,
      notes: notes || undefined,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onSaved?.();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Miscellaneous Charge</CardTitle>
        <CardDescription>
          Assign to an owner, lot, or location. Charges roll into owner billing and Owner Totals.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="misc-owner">Owner *</Label>
            <select
              id="misc-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={selectClass}
              required
            >
              <option value="">Select owner…</option>
              {ownerOptions
                .filter((o) => !o.is_ownership_group)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label htmlFor="misc-date">Date</Label>
            <Input
              id="misc-date"
              type="date"
              value={chargeDate}
              onChange={(e) => setChargeDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="misc-lot">Lot (optional)</Label>
            <select
              id="misc-lot"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              className={selectClass}
            >
              <option value="">—</option>
              {lotOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="misc-location">Location (optional)</Label>
            <select
              id="misc-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={selectClass}
            >
              <option value="">—</option>
              {locationOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="misc-desc">Description *</Label>
          <Input
            id="misc-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Freight, bedding, trucking…"
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="misc-qty">Quantity (optional)</Label>
            <Input
              id="misc-qty"
              type="number"
              min={0}
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="misc-unit">Unit cost (optional)</Label>
            <Input
              id="misc-unit"
              type="number"
              min={0}
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="misc-amt">Amount *</Label>
            <Input
              id="misc-amt"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="misc-notes">Notes</Label>
          <Input id="misc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save charge"}
        </Button>
      </form>
    </Card>
  );
}
