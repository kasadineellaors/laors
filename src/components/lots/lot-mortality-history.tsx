"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MortalityRecord } from "@/lib/lots/types";
import { archiveMortalityRecord, updateMortalityRecord } from "@/lib/actions/lots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface LotMortalityHistoryProps {
  orgId: string;
  groupId: string;
  records: MortalityRecord[];
  canManage: boolean;
}

export function LotMortalityHistory({
  orgId,
  groupId,
  records,
  canManage,
}: LotMortalityHistoryProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [diedAt, setDiedAt] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [cause, setCause] = useState("");
  const [valueLost, setValueLost] = useState("");

  function startEdit(record: MortalityRecord) {
    setEditingId(record.id);
    setDiedAt(record.died_at);
    setHeadCount(String(record.head_count));
    setCause(record.cause ?? "");
    setValueLost(record.value_lost != null ? String(record.value_lost) : "");
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
      setError("Enter head count");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updateMortalityRecord(orgId, groupId, editingId, {
      diedAt,
      headCount: heads,
      cause: cause || undefined,
      valueLost: valueLost.trim() ? parseFloat(valueLost) : null,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      cancelEdit();
      router.refresh();
    }
  }

  async function handleArchive(recordId: string) {
    if (
      !window.confirm(
        "Remove this death record? Head count will be restored on the lot.",
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await archiveMortalityRecord(orgId, groupId, recordId);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      if (editingId === recordId) cancelEdit();
      router.refresh();
    }
  }

  if (records.length === 0 && !editingId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Death loss</CardTitle>
      </CardHeader>
      <div className="space-y-3 px-4 pb-4">
        <ul className="divide-y divide-border">
          {records.map((d) => (
            <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <span>
                  {d.died_at} · {d.head_count} hd
                  {d.cause ? ` · ${d.cause}` : ""}
                </span>
                {d.value_lost != null ? (
                  <span className="ml-2 font-semibold tabular-nums text-status-critical">
                    {money(d.value_lost)}
                  </span>
                ) : null}
              </div>
              {canManage ? (
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(d)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => handleArchive(d.id)}
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
            <p className="text-sm font-semibold text-navy">Edit death record</p>
            <p className="text-xs text-text-secondary">
              Changing head count adjusts lot inventory automatically.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editDiedAt">Date</Label>
                <Input
                  id="editDiedAt"
                  type="date"
                  value={diedAt}
                  onChange={(ev) => setDiedAt(ev.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="editDeathHead">Head</Label>
                <Input
                  id="editDeathHead"
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
              <Label htmlFor="editCause">Cause</Label>
              <Input id="editCause" value={cause} onChange={(ev) => setCause(ev.target.value)} />
            </div>
            <div>
              <Label htmlFor="editValueLost">Value lost ($)</Label>
              <Input
                id="editValueLost"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={valueLost}
                onChange={(ev) => setValueLost(ev.target.value)}
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
