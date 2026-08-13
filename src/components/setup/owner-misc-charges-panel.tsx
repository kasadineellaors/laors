"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnerMiscCharge } from "@/lib/owners/types";
import {
  archiveOwnerMiscCharge,
  createOwnerMiscCharge,
  updateOwnerMiscCharge,
} from "@/lib/actions/owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface OwnerMiscChargesPanelProps {
  orgId: string;
  ownerId: string;
  ownerName: string;
  charges: OwnerMiscCharge[];
}

export function OwnerMiscChargesPanel({
  orgId,
  ownerId,
  ownerName,
  charges,
}: OwnerMiscChargesPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chargeDate, setChargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setChargeDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setAmount("");
    setNotes("");
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function startEdit(charge: OwnerMiscCharge) {
    setEditingId(charge.id);
    setShowForm(false);
    setChargeDate(charge.charge_date);
    setDescription(charge.description);
    setAmount(String(charge.amount));
    setNotes(charge.notes ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      chargeDate,
      description,
      amount,
      notes: notes || undefined,
    };

    const result = editingId
      ? await updateOwnerMiscCharge(orgId, editingId, payload)
      : await createOwnerMiscCharge(orgId, { ownerId, ...payload });

    setLoading(false);
    if (result.error) setError(result.error);
    else {
      resetForm();
      router.refresh();
    }
  }

  async function handleArchive(chargeId: string) {
    if (!window.confirm("Remove this misc charge?")) return;
    setLoading(true);
    setError(null);
    const result = await archiveOwnerMiscCharge(orgId, chargeId);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      if (editingId === chargeId) resetForm();
      router.refresh();
    }
  }

  const showChargeForm = showForm || editingId != null;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border-neutral px-3 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-navy">Misc charges — {ownerName}</p>
        <Button
          type="button"
          size="sm"
          variant={showForm ? "primary" : "outline"}
          onClick={() => {
            if (showForm) resetForm();
            else {
              setEditingId(null);
              setShowForm(true);
            }
          }}
          disabled={loading}
        >
          {showForm ? "Cancel" : "Add charge"}
        </Button>
      </div>

      {charges.length > 0 ? (
        <ul className="space-y-1">
          {charges.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-tan/10 px-2 py-1.5"
            >
              <span className="text-text-secondary">
                {c.charge_date} · {c.description} ·{" "}
                <span className="font-semibold text-navy">{money(c.amount)}</span>
                {c.invoiced_at ? " · invoiced" : ""}
              </span>
              {!c.invoiced_at ? (
                <span className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchive(c.id)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-secondary">No misc charges yet.</p>
      )}

      {showChargeForm ? (
        <form onSubmit={handleSubmit} className="space-y-2 border-t border-border-neutral pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {editingId ? "Edit charge" : "New charge"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`misc-date-${ownerId}`}>Date</Label>
              <Input
                id={`misc-date-${ownerId}`}
                type="date"
                value={chargeDate}
                onChange={(e) => setChargeDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`misc-amt-${ownerId}`}>Amount</Label>
              <Input
                id={`misc-amt-${ownerId}`}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            required
          />
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
          />
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving…" : editingId ? "Save" : "Log charge"}
          </Button>
        </form>
      ) : null}

      {error ? (
        <p className="text-xs text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
