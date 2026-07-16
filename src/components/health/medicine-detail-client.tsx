"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MedicineItemRecord, MedicineStockAdjustment } from "@/lib/medicine/types";
import { adjustMedicineStock, archiveMedicineItem } from "@/lib/actions/medicine";
import { costLabelForUnit, formatMedicineUnit, formatQuantityWithUnit } from "@/lib/health/display";
import { MedicineForm } from "@/components/health/medicine-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MedicineDetailClientProps {
  orgId: string;
  item: MedicineItemRecord;
  adjustments: MedicineStockAdjustment[];
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MedicineDetailClient({
  orgId,
  item,
  adjustments,
}: MedicineDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adjustMode, setAdjustMode] = useState<"receive" | "use" | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustCost, setAdjustCost] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdjust(type: "receive" | "use") {
    const qty = parseFloat(adjustQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Enter a positive quantity");
      return;
    }
    setLoading(true);
    setError(null);
    const delta = type === "receive" ? qty : -qty;
    const result = await adjustMedicineStock(orgId, item.id, {
      delta,
      adjustmentType: type,
      notes: adjustNotes || undefined,
      totalCost: type === "receive" && adjustCost.trim() ? parseFloat(adjustCost) : undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setAdjustMode(null);
      setAdjustQty("");
      setAdjustNotes("");
      router.refresh();
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archive "${item.name}"?`)) return;
    setLoading(true);
    const result = await archiveMedicineItem(orgId, item.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/health/medicine");
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href="/health/medicine" className="text-sm font-medium text-brown hover:underline">
          ← Medicine Inventory
        </Link>
        <MedicineForm
          orgId={orgId}
          item={item}
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/health/medicine" className="text-sm font-medium text-brown hover:underline">
        ← Medicine Inventory
      </Link>

      <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-5 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-bold text-navy">{item.name}</h1>
        <p className="text-sm text-text-secondary">
          Unit: {formatMedicineUnit(item.unit)}
          {item.price_per_cc != null
            ? ` · ${costLabelForUnit(item.unit)}: $${item.price_per_cc}`
            : ""}
        </p>
        <p className="mt-3 text-3xl font-bold text-navy">
          {formatQuantityWithUnit(item.quantity_on_hand, item.unit)}{" "}
          <span className="text-lg font-semibold text-text-secondary">on hand</span>
        </p>
        {item.is_out_of_stock ? (
          <p className="mt-2 text-sm font-semibold text-status-critical">Out of stock</p>
        ) : item.is_low_stock ? (
          <p className="mt-2 text-sm font-semibold text-status-warning">
            Low stock — reorder at {item.reorder_at} {formatMedicineUnit(item.unit)}
          </p>
        ) : null}
        {item.withdrawal_days != null && item.withdrawal_days > 0 ? (
          <p className="mt-2 text-sm text-text-secondary">
            Default meat withdrawal: {item.withdrawal_days} day
            {item.withdrawal_days === 1 ? "" : "s"}
          </p>
        ) : null}
        {item.notes ? <p className="mt-3 text-sm text-text-secondary">{item.notes}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={() => setAdjustMode("receive")}>
          Receive
        </Button>
        <Button variant="outline" size="lg" onClick={() => setAdjustMode("use")}>
          Use / adjust
        </Button>
      </div>

      {adjustMode ? (
        <div className="rounded-xl border border-border-neutral bg-surface-white p-4 space-y-3">
          <p className="font-semibold text-navy">
            {adjustMode === "receive" ? "Receive stock" : "Use or remove stock"}
          </p>
          <div>
            <Label htmlFor="adjustQty">Quantity ({item.unit})</Label>
            <Input
              id="adjustQty"
              type="number"
              min={0}
              step="0.01"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />
          </div>
          {adjustMode === "receive" ? (
            <div>
              <Label htmlFor="adjustCost">Total purchase cost ($)</Label>
              <Input
                id="adjustCost"
                type="number"
                min={0}
                step="0.01"
                value={adjustCost}
                onChange={(e) => setAdjustCost(e.target.value)}
                placeholder="Updates weighted average for invoicing"
              />
            </div>
          ) : null}
          <div>
            <Input
              id="adjustNotes"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleAdjust(adjustMode)}
              disabled={loading}
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setAdjustMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {adjustments.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Recent adjustments
          </h2>
          <ul className="space-y-2">
            {adjustments.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium capitalize text-text-primary">{a.adjustment_type}</span>
                  <span className={a.delta >= 0 ? "text-brown" : "text-status-critical"}>
                    {a.delta >= 0 ? "+" : ""}
                    {a.delta}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  {formatWhen(a.created_at)}
                  {a.created_by_name ? ` · ${a.created_by_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={() => setEditing(true)} disabled={loading}>
          Edit details
        </Button>
        <Button variant="danger" size="lg" onClick={handleArchive} disabled={loading}>
          Archive
        </Button>
      </div>
    </div>
  );
}
