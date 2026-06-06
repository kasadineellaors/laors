"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementRecord } from "@/lib/inventory/types";
import type { SelectOption } from "@/lib/locations/options";
import { voidCattleMove, updateMovementNotes } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

interface MoveHistoryListProps {
  orgId: string;
  movements: MovementRecord[];
  movementReasonOptions: SelectOption[];
}

export function MoveHistoryList({
  orgId,
  movements,
  movementReasonOptions,
}: MoveHistoryListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVoid(id: string) {
    if (!window.confirm("Void this move? Head counts will be reversed.")) return;
    setLoading(true);
    setError(null);
    const result = await voidCattleMove(orgId, id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    setError(null);
    const result = await updateMovementNotes(orgId, id, notes, reasonId || null);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setEditingId(null);
      router.refresh();
    }
  }

  if (movements.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-charcoal/60">
        No moves recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rust">{error}</p> : null}
      <ul className="space-y-3">
        {movements.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-xl border border-border bg-surface p-4",
              m.status === "voided" && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-charcoal">
                  {m.total_head} head · {m.is_partial ? "Partial" : "Full"} move
                </p>
                <p className="text-sm text-charcoal/70">
                  {m.source_group_name} → {m.destination_group_name}
                </p>
                <p className="text-xs text-charcoal/50">
                  {m.source_location_name ?? "?"} → {m.destination_location_name ?? "?"}
                </p>
                <p className="mt-1 text-xs text-charcoal/50">
                  {new Date(m.moved_at).toLocaleString()}
                  {m.reason_name ? ` · ${m.reason_name}` : ""}
                </p>
                {m.lines.length > 0 ? (
                  <p className="mt-2 text-xs text-charcoal/60">
                    {m.lines
                      .map((l) => `${l.head_count} ${l.classification_name}`)
                      .join(" · ")}
                  </p>
                ) : null}
                {m.notes ? (
                  <p className="mt-1 text-sm italic text-charcoal/60">{m.notes}</p>
                ) : null}
                {m.status === "voided" ? (
                  <p className="mt-1 text-xs font-semibold text-rust">Voided</p>
                ) : null}
              </div>
            </div>

            {m.status === "completed" ? (
              editingId === m.id ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div>
                    <Label htmlFor={`notes-${m.id}`}>Notes</Label>
                    <Input
                      id={`notes-${m.id}`}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  {movementReasonOptions.length > 0 ? (
                    <select
                      value={reasonId}
                      onChange={(e) => setReasonId(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                    >
                      <option value="">Reason</option>
                      {movementReasonOptions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(m.id)} disabled={loading}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(m.id);
                      setNotes(m.notes ?? "");
                      setReasonId(m.movement_reason_id ?? "");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleVoid(m.id)}
                    disabled={loading}
                  >
                    Void
                  </Button>
                </div>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
