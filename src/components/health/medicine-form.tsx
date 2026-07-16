"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MedicineItemRecord } from "@/lib/medicine/types";
import { createMedicineItem, updateMedicineItem } from "@/lib/actions/medicine";
import { costLabelForUnit, formatMedicineUnit } from "@/lib/health/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const UNIT_OPTIONS = ["mL", "dose", "tablet", "bolus", "bottle", "packet"];

interface MedicineFormProps {
  orgId: string;
  item?: MedicineItemRecord;
  onSuccess?: () => void;
}

export function MedicineForm({ orgId, item, onSuccess }: MedicineFormProps) {
  const router = useRouter();
  const isEdit = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "mL");
  const [quantityOnHand, setQuantityOnHand] = useState(
    item != null ? String(item.quantity_on_hand) : "0",
  );
  const [reorderAt, setReorderAt] = useState(
    item?.reorder_at != null ? String(item.reorder_at) : "",
  );
  const [pricePerCc, setPricePerCc] = useState(
    item?.price_per_cc != null ? String(item.price_per_cc) : "",
  );
  const [withdrawalDays, setWithdrawalDays] = useState(
    item?.withdrawal_days != null ? String(item.withdrawal_days) : "",
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayUnit = formatMedicineUnit(unit);
  const billingLabel = costLabelForUnit(unit);

  const normalizedUnitWarning = useMemo(() => {
    const lower = unit.trim().toLowerCase();
    if (lower === "cc" || lower === "ml") return null;
    if (lower === "dose" && pricePerCc.trim()) {
      return "Billing rate is per dose — ensure treatment quantities use the same unit.";
    }
    return null;
  }, [unit, pricePerCc]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const qty = parseFloat(quantityOnHand);
    const reorder = reorderAt.trim() ? parseFloat(reorderAt) : undefined;
    const price = pricePerCc.trim() ? parseFloat(pricePerCc) : undefined;
    const withdrawal = withdrawalDays.trim() ? parseInt(withdrawalDays, 10) : undefined;

    if (!isEdit && (Number.isNaN(qty) || qty < 0)) {
      setError("Enter a valid starting quantity");
      setLoading(false);
      return;
    }
    if (reorderAt.trim() && (Number.isNaN(reorder!) || reorder! < 0)) {
      setError("Reorder level must be zero or greater");
      setLoading(false);
      return;
    }
    if (pricePerCc.trim() && (Number.isNaN(price!) || price! < 0)) {
      setError(`Enter a valid ${billingLabel.toLowerCase()}`);
      setLoading(false);
      return;
    }
    if (withdrawalDays.trim() && (Number.isNaN(withdrawal!) || withdrawal! < 0)) {
      setError("Withdrawal days must be zero or greater");
      setLoading(false);
      return;
    }

    const result = isEdit
      ? await updateMedicineItem(orgId, item!.id, {
          name,
          unit,
          reorderAt: reorderAt.trim() ? reorder! : null,
          pricePerCc: pricePerCc.trim() ? price! : null,
          withdrawalDays: withdrawalDays.trim() ? withdrawal! : null,
          notes: notes || null,
        })
      : await createMedicineItem(orgId, {
          name,
          unit,
          quantityOnHand: qty,
          reorderAt: reorder,
          pricePerCc: price,
          withdrawalDays: withdrawal,
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

  const selectClass =
    "flex h-12 min-h-12 w-full rounded-lg border border-border-neutral bg-surface-white px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-navy">{isEdit ? "Edit medicine" : "Add medicine"}</CardTitle>
        <CardDescription>
          Record on-hand inventory, billing rate, reorder levels, and withdrawal defaults.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Product name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Excede, Long Range, Cydectin"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="unit">Inventory unit</Label>
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
          {!isEdit ? (
            <div>
              <Label htmlFor="qty">Starting quantity ({displayUnit})</Label>
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
          ) : null}
        </div>

        <div>
          <Label htmlFor="pricePerCc">{billingLabel} ($)</Label>
          <Input
            id="pricePerCc"
            type="number"
            min={0}
            step="0.0001"
            value={pricePerCc}
            onChange={(e) => setPricePerCc(e.target.value)}
            placeholder="Rate used when billing treatments"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Treatment billing rate per {displayUnit} — stored in the existing price field.
          </p>
        </div>

        <div>
          <Label htmlFor="reorder">
            Reorder when inventory reaches{displayUnit ? ` (${displayUnit})` : ""}
          </Label>
          <Input
            id="reorder"
            type="number"
            min={0}
            step="0.01"
            value={reorderAt}
            onChange={(e) => setReorderAt(e.target.value)}
            placeholder={`e.g. 100 ${displayUnit}`}
          />
        </div>

        <div>
          <Label htmlFor="withdrawalDays">Default meat withdrawal days (optional)</Label>
          <Input
            id="withdrawalDays"
            type="number"
            min={0}
            step={1}
            value={withdrawalDays}
            onChange={(e) => setWithdrawalDays(e.target.value)}
            placeholder="Used to calculate withdrawal end dates on treatments"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Confirm withdrawal periods with your veterinarian and ranch protocol.
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {normalizedUnitWarning ? (
          <p className="text-sm text-status-warning" role="status">
            {normalizedUnitWarning}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pb-4">
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save changes" : "Add medicine"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
