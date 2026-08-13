"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementRecord } from "@/lib/inventory/types";
import type { SelectOption, TreePickerOption } from "@/lib/locations/options";
import {
  findPropertyRoot,
  resolveLocationSelection,
} from "@/lib/locations/picker";
import { fetchGroupsAtLocation, updateCattleMove } from "@/lib/actions/inventory";
import { CascadingLocationPicker } from "@/components/locations/cascading-location-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function initialDestLocationState(
  tree: TreePickerOption[],
  locationId: string,
): { parentId: string; subLocationId: string } {
  if (!locationId) return { parentId: "", subLocationId: "" };
  const property = findPropertyRoot(tree, locationId);
  if (!property) return { parentId: "", subLocationId: locationId };
  if (locationId === property.id) {
    return { parentId: property.id, subLocationId: "" };
  }
  return { parentId: property.id, subLocationId: locationId };
}

function movedAtDateValue(movedAt: string) {
  return movedAt.slice(0, 10);
}

interface EditCattleMovePanelProps {
  orgId: string;
  movement: MovementRecord;
  locationTree: TreePickerOption[];
  movementReasonOptions: SelectOption[];
  onCancel: () => void;
}

export function EditCattleMovePanel({
  orgId,
  movement,
  locationTree,
  movementReasonOptions,
  onCancel,
}: EditCattleMovePanelProps) {
  const router = useRouter();
  const initialDest = initialDestLocationState(
    locationTree,
    movement.destination_location_id,
  );

  const [destParentId, setDestParentId] = useState(initialDest.parentId);
  const [destSubLocationId, setDestSubLocationId] = useState(initialDest.subLocationId);
  const [destinationGroupId, setDestinationGroupId] = useState(movement.destination_group_id);
  const [reasonId, setReasonId] = useState(movement.movement_reason_id ?? "");
  const [notes, setNotes] = useState(movement.notes ?? "");
  const [headToMove, setHeadToMove] = useState(String(movement.total_head));
  const [movedAt, setMovedAt] = useState(movedAtDateValue(movement.moved_at));
  const [outWeightLbs, setOutWeightLbs] = useState(
    movement.out_weight_lbs != null ? String(movement.out_weight_lbs) : "",
  );
  const [destGroups, setDestGroups] = useState<
    { id: string; name: string; total_head: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const destinationLocationId = resolveLocationSelection(
    locationTree,
    destParentId,
    destSubLocationId,
  );

  useEffect(() => {
    if (!destinationLocationId) {
      setDestGroups([]);
      return;
    }
    let cancelled = false;
    fetchGroupsAtLocation(orgId, destinationLocationId).then((groups) => {
      if (cancelled) return;
      setDestGroups(groups);
      setDestinationGroupId((current) => {
        if (current && groups.some((g) => g.id === current)) return current;
        if (groups.some((g) => g.id === movement.destination_group_id)) {
          return movement.destination_group_id;
        }
        return "";
      });
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, destinationLocationId, movement.destination_group_id]);

  const selectClass =
    "flex h-10 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!destinationLocationId) {
      setError("Select a destination location");
      return;
    }

    const heads = parseInt(headToMove, 10);
    if (Number.isNaN(heads) || heads <= 0) {
      setError("Enter how many head to move");
      return;
    }

    const trimmedOut = outWeightLbs.trim();
    let parsedOut: number | null = null;
    if (trimmedOut) {
      parsedOut = parseFloat(trimmedOut);
      if (Number.isNaN(parsedOut) || parsedOut < 0) {
        setError("Enter a valid outweight in pounds");
        return;
      }
    }

    setLoading(true);
    setError(null);

    const result = await updateCattleMove(orgId, movement.id, {
      destinationLocationId,
      destinationGroupId: destinationGroupId || undefined,
      movementReasonId: reasonId || null,
      notes,
      headToMove: heads,
      movedAt,
      outWeightLbs: parsedOut,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else {
      onCancel();
      router.refresh();
    }
  }

  const destGroupOptions = useMemo(() => {
    const options = destGroups.map((g) => ({
      id: g.id,
      label: `${g.name} (${g.total_head} hd)`,
    }));
    if (
      movement.destination_group_id &&
      !options.some((o) => o.id === movement.destination_group_id)
    ) {
      options.unshift({
        id: movement.destination_group_id,
        label: movement.destination_group_name,
      });
    }
    return options;
  }, [destGroups, movement.destination_group_id, movement.destination_group_name]);

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 border-t border-border-neutral pt-3" noValidate>
      <p className="text-sm font-semibold text-navy">Edit move</p>
      <p className="text-xs text-text-secondary">
        From <span className="font-medium text-navy">{movement.source_group_name}</span>
        {movement.source_location_name ? ` · ${movement.source_location_name}` : ""}. Head and
        destination changes update pen counts automatically.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`move-date-${movement.id}`}>Move date</Label>
          <Input
            id={`move-date-${movement.id}`}
            type="date"
            value={movedAt}
            onChange={(e) => setMovedAt(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor={`move-head-${movement.id}`}>Head to move</Label>
          <Input
            id={`move-head-${movement.id}`}
            type="number"
            min={1}
            inputMode="numeric"
            value={headToMove}
            onChange={(e) => setHeadToMove(e.target.value)}
            required
          />
        </div>
      </div>

      <CascadingLocationPicker
        idPrefix={`edit-dest-${movement.id}`}
        locationTree={locationTree}
        parentId={destParentId}
        subLocationId={destSubLocationId}
        onParentChange={setDestParentId}
        onSubLocationChange={setDestSubLocationId}
        parentLabel="Destination area"
        subLocationLabel="Destination pen"
        parentRequired
        subLocationRequired
      />

      {destinationLocationId ? (
        <div>
          <Label htmlFor={`dest-group-${movement.id}`}>Destination lot (optional)</Label>
          <select
            id={`dest-group-${movement.id}`}
            value={destinationGroupId}
            onChange={(e) => setDestinationGroupId(e.target.value)}
            className={selectClass}
          >
            <option value="">Same lot name at destination</option>
            {destGroupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {movementReasonOptions.length > 0 ? (
        <div>
          <Label htmlFor={`move-reason-${movement.id}`}>Reason</Label>
          <select
            id={`move-reason-${movement.id}`}
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {movementReasonOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <Label htmlFor={`outweight-${movement.id}`}>Outweight (lb, optional)</Label>
        <Input
          id={`outweight-${movement.id}`}
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          value={outWeightLbs}
          onChange={(e) => setOutWeightLbs(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor={`notes-${movement.id}`}>Notes</Label>
        <Input
          id={`notes-${movement.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
