"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementRecord } from "@/lib/inventory/types";
import type { SelectOption, TreePickerOption } from "@/lib/locations/options";
import { voidCattleMove } from "@/lib/actions/inventory";
import { EditCattleMovePanel } from "@/components/inventory/edit-cattle-move-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface MoveHistoryListProps {
  orgId: string;
  movements: MovementRecord[];
  movementReasonOptions: SelectOption[];
  locationTree: TreePickerOption[];
}

export function MoveHistoryList({
  orgId,
  movements,
  movementReasonOptions,
  locationTree,
}: MoveHistoryListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
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

  if (movements.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral px-6 py-10 text-center text-text-secondary">
        No moves recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-status-critical">{error}</p> : null}
      <ul className="space-y-3">
        {movements.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-xl border border-border-neutral bg-surface-white p-4",
              m.status === "voided" && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-navy">
                  {m.total_head} head · {m.is_partial ? "Partial" : "Full"} move
                </p>
                <p className="text-sm text-text-secondary">
                  {m.source_group_name} → {m.destination_group_name}
                </p>
                <p className="text-xs text-text-secondary">
                  {m.source_location_name ?? "?"} → {m.destination_location_name ?? "?"}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {new Date(m.moved_at).toLocaleString()}
                  {m.reason_name ? ` · ${m.reason_name}` : ""}
                </p>
                {m.lines.length > 0 ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    {m.lines
                      .map((l) => `${l.head_count} ${l.classification_name}`)
                      .join(" · ")}
                  </p>
                ) : null}
                {m.out_weight_lbs != null ? (
                  <p className="mt-1 text-sm text-text-secondary">
                    Outweight: {m.out_weight_lbs.toLocaleString()} lb
                    {m.total_head > 0
                      ? ` (${Math.round((m.out_weight_lbs / m.total_head) * 10) / 10} lb/hd)`
                      : ""}
                  </p>
                ) : null}
                {m.notes ? (
                  <p className="mt-1 text-sm italic text-text-secondary">{m.notes}</p>
                ) : null}
                {m.status === "voided" ? (
                  <p className="mt-1 text-xs font-semibold text-status-critical">Voided</p>
                ) : null}
              </div>
            </div>

            {m.status === "completed" ? (
              editingId === m.id ? (
                <EditCattleMovePanel
                  orgId={orgId}
                  movement={m}
                  locationTree={locationTree}
                  movementReasonOptions={movementReasonOptions}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(m.id);
                      setError(null);
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
