"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProcessingEventRecord } from "@/lib/lots/types";
import { PROCESSING_TYPE_LABELS, type ProcessingType } from "@/lib/lots/types";
import {
  archiveProcessingEvent,
  updateProcessingEvent,
} from "@/lib/actions/lots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface LotProcessingHistoryProps {
  orgId: string;
  groupId: string;
  events: ProcessingEventRecord[];
  canManage: boolean;
}

export function LotProcessingHistory({
  orgId,
  groupId,
  events,
  canManage,
}: LotProcessingHistoryProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [processedAt, setProcessedAt] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [processingType, setProcessingType] = useState<ProcessingType>("arrival");
  const [chuteCharge, setChuteCharge] = useState("");
  const [laborCharge, setLaborCharge] = useState("");
  const [processingFee, setProcessingFee] = useState("");
  const [medicineCost, setMedicineCost] = useState("");
  const [notes, setNotes] = useState("");

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  function startEdit(event: ProcessingEventRecord) {
    setEditingId(event.id);
    setProcessedAt(event.processed_at);
    setHeadCount(String(event.head_count));
    setProcessingType(event.processing_type);
    setChuteCharge(String(event.chute_charge ?? ""));
    setLaborCharge(String(event.labor_charge ?? ""));
    setProcessingFee(String(event.processing_fee ?? ""));
    setMedicineCost(String(event.medicine_cost ?? ""));
    setNotes(event.notes ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const heads = parseInt(headCount, 10);
    if (Number.isNaN(heads) || heads <= 0) {
      setError("Enter head processed");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updateProcessingEvent(orgId, groupId, editingId, {
      processedAt,
      headCount: heads,
      processingType,
      chuteCharge: chuteCharge.trim() ? parseFloat(chuteCharge) : 0,
      laborCharge: laborCharge.trim() ? parseFloat(laborCharge) : 0,
      processingFee: processingFee.trim() ? parseFloat(processingFee) : 0,
      medicineCost: medicineCost.trim() ? parseFloat(medicineCost) : 0,
      notes: notes || undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      cancelEdit();
      router.refresh();
    }
  }

  async function handleArchive(eventId: string) {
    if (!window.confirm("Remove this processing event?")) return;
    setLoading(true);
    setError(null);
    const result = await archiveProcessingEvent(orgId, groupId, eventId);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      if (editingId === eventId) cancelEdit();
      router.refresh();
    }
  }

  if (events.length === 0 && !editingId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing history</CardTitle>
      </CardHeader>
      <div className="space-y-3 px-4 pb-4">
        <ul className="divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <span>
                  {e.processed_at} · {PROCESSING_TYPE_LABELS[e.processing_type]} · {e.head_count} hd
                </span>
                <span className="ml-2 font-semibold tabular-nums">{money(e.total_cost)}</span>
              </div>
              {canManage ? (
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(e)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => handleArchive(e.id)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {canManage && editingId ? (
          <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-border-neutral p-3">
            <p className="text-sm font-semibold text-navy">Edit processing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editProcessedAt">Date</Label>
                <Input
                  id="editProcessedAt"
                  type="date"
                  value={processedAt}
                  onChange={(ev) => setProcessedAt(ev.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="editHeadProcessed">Head processed</Label>
                <Input
                  id="editHeadProcessed"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={headCount}
                  onChange={(ev) => setHeadCount(ev.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editPtype">Type</Label>
              <select
                id="editPtype"
                value={processingType}
                onChange={(ev) => setProcessingType(ev.target.value as ProcessingType)}
                className={selectClass}
              >
                {Object.entries(PROCESSING_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <Label htmlFor="editChute">Chute $</Label>
                <Input
                  id="editChute"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={chuteCharge}
                  onChange={(ev) => setChuteCharge(ev.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="editLabor">Labor $</Label>
                <Input
                  id="editLabor"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={laborCharge}
                  onChange={(ev) => setLaborCharge(ev.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="editFee">Fee $</Label>
                <Input
                  id="editFee"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={processingFee}
                  onChange={(ev) => setProcessingFee(ev.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="editMed">Medicine $</Label>
                <Input
                  id="editMed"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={medicineCost}
                  onChange={(ev) => setMedicineCost(ev.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editProcNotes">Notes</Label>
              <Input
                id="editProcNotes"
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
