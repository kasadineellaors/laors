"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import type { SelectOption, TreePickerOption } from "@/lib/locations/options";
import {
  collectDescendantIds,
  findPropertyRoot,
  findTreeNode,
  resolveLocationSelection,
} from "@/lib/locations/picker";
import { executeCattleMove, fetchGroupsAtLocation, recordCattleRemoval } from "@/lib/actions/inventory";
import {
  SHIPPING_REASON_LABELS,
  type ShippingReason,
} from "@/lib/cow-calf/shipping-constants";
import { CascadingLocationPicker } from "@/components/locations/cascading-location-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MoveCattleFormProps {
  orgId: string;
  groups: CattleGroupSummary[];
  locationTree: TreePickerOption[];
  movementReasonOptions: SelectOption[];
  initialSourceGroupId?: string;
  initialMode?: "move" | "remove";
}

function initialSourceLocationState(
  tree: TreePickerOption[],
  group: CattleGroupSummary | undefined,
): { parentId: string; subLocationId: string } {
  if (!group?.location_id) return { parentId: "", subLocationId: "" };
  const property = findPropertyRoot(tree, group.location_id);
  if (!property) return { parentId: "", subLocationId: group.location_id };
  if (group.location_id === property.id) {
    return { parentId: property.id, subLocationId: "" };
  }
  return { parentId: property.id, subLocationId: group.location_id };
}

export function MoveCattleForm({
  orgId,
  groups,
  locationTree,
  movementReasonOptions,
  initialSourceGroupId,
  initialMode = "move",
}: MoveCattleFormProps) {
  const router = useRouter();
  const [operation, setOperation] = useState<"move" | "remove">(initialMode);
  const initialGroup = groups.find((g) => g.id === initialSourceGroupId) ?? groups[0];
  const initialSource = initialSourceLocationState(locationTree, initialGroup);

  const [sourceParentId, setSourceParentId] = useState(initialSource.parentId);
  const [sourceSubLocationId, setSourceSubLocationId] = useState(initialSource.subLocationId);
  const [sourceGroupId, setSourceGroupId] = useState(initialGroup?.id ?? "");
  const [destParentId, setDestParentId] = useState("");
  const [destSubLocationId, setDestSubLocationId] = useState("");
  const [destinationGroupId, setDestinationGroupId] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [notes, setNotes] = useState("");
  const [headToMove, setHeadToMove] = useState(
    initialGroup?.total_head ? String(initialGroup.total_head) : "",
  );
  const [movedAt, setMovedAt] = useState(new Date().toISOString().slice(0, 10));
  const [outWeightLbs, setOutWeightLbs] = useState("");
  const [removalReason, setRemovalReason] = useState<ShippingReason>("return_to_owner");
  const [destinationName, setDestinationName] = useState("");
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

  const filteredGroups = useMemo(() => {
    if (!sourceParentId && !sourceSubLocationId) return groups;

    if (sourceSubLocationId) {
      return groups.filter((g) => g.location_id === sourceSubLocationId);
    }

    const parent = findTreeNode(locationTree, sourceParentId);
    if (!parent) return groups;
    const locationIds = new Set(collectDescendantIds(parent));
    return groups.filter((g) => g.location_id && locationIds.has(g.location_id));
  }, [groups, sourceParentId, sourceSubLocationId, locationTree]);

  const sourceGroup = useMemo(
    () =>
      filteredGroups.find((g) => g.id === sourceGroupId) ??
      groups.find((g) => g.id === sourceGroupId),
    [filteredGroups, groups, sourceGroupId],
  );

  useEffect(() => {
    if (!sourceParentId && !sourceSubLocationId) return;
    if (sourceGroup && filteredGroups.some((g) => g.id === sourceGroup.id)) return;
    const first = filteredGroups[0];
    setSourceGroupId(first?.id ?? "");
  }, [sourceParentId, sourceSubLocationId, filteredGroups, sourceGroup]);

  useEffect(() => {
    if (sourceGroup) {
      setHeadToMove(String(sourceGroup.total_head));
    }
  }, [sourceGroup]);

  useEffect(() => {
    if (!destinationLocationId) {
      setDestGroups([]);
      setDestinationGroupId("");
      return;
    }
    fetchGroupsAtLocation(orgId, destinationLocationId).then(setDestGroups);
  }, [orgId, destinationLocationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceGroupId || !sourceGroup) {
      setError("Select a source group with cattle to move");
      return;
    }

    const count = parseInt(headToMove, 10);
    if (Number.isNaN(count) || count <= 0) {
      setError("Enter how many head to move");
      return;
    }
    if (count > sourceGroup.total_head) {
      setError(`Only ${sourceGroup.total_head} head available`);
      return;
    }

    const parsedOutWeight = outWeightLbs.trim() ? parseFloat(outWeightLbs) : null;
    if (parsedOutWeight != null && (Number.isNaN(parsedOutWeight) || parsedOutWeight < 0)) {
      setError("Enter a valid outweight in pounds");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (operation === "remove") {
        const result = await recordCattleRemoval(orgId, {
          sourceGroupId,
          headCount: count,
          removedAt: movedAt,
          outWeightLbs: parsedOutWeight ?? undefined,
          reason: removalReason,
          notes: notes || undefined,
          destinationName: destinationName || undefined,
        });

        if (result.error) {
          setError(result.error);
          return;
        }
        router.push(`/cattle/groups/${sourceGroupId}`);
        router.refresh();
        return;
      }

      if (!destParentId) {
        setError("Select a destination area");
        return;
      }
      if (!destinationLocationId) {
        setError("Select a destination pen under that area");
        return;
      }

      const result = await executeCattleMove(orgId, {
        sourceGroupId,
        destinationLocationId,
        destinationGroupId: destinationGroupId || undefined,
        movementReasonId: reasonId || undefined,
        notes: notes || undefined,
        headToMove: count,
        movedAt,
        outWeightLbs: parsedOutWeight ?? undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/cattle/moves");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const parsedHead = parseInt(headToMove, 10) || 0;
  const parsedOutWeight = outWeightLbs.trim() ? parseFloat(outWeightLbs) : null;
  const outWeightPerHead =
    parsedOutWeight != null && parsedHead > 0 && !Number.isNaN(parsedOutWeight)
      ? Math.round((parsedOutWeight / parsedHead) * 10) / 10
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>What are you doing?</CardTitle>
          <CardDescription>
            Move cattle to another pen, or remove head when owners pick up cattle without a ranch
            destination.
          </CardDescription>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <Button
            type="button"
            variant={operation === "move" ? "primary" : "secondary"}
            onClick={() => setOperation("move")}
          >
            Move to another pen
          </Button>
          <Button
            type="button"
            variant={operation === "remove" ? "primary" : "secondary"}
            onClick={() => setOperation("remove")}
          >
            Remove from ranch
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>From</CardTitle>
          <CardDescription>
            {operation === "move"
              ? "Pick an area and pen, then the group and head count to move"
              : "Select the lot and how many head left the ranch"}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <CascadingLocationPicker
            idPrefix="source"
            locationTree={locationTree}
            parentId={sourceParentId}
            subLocationId={sourceSubLocationId}
            onParentChange={setSourceParentId}
            onSubLocationChange={setSourceSubLocationId}
            parentLabel="Parent location (optional)"
            subLocationLabel="Sub-location (optional)"
            allowAllParent
            allowAllSub
          />
          <div>
            <Label htmlFor="sourceGroup">Source group</Label>
            <select
              id="sourceGroup"
              value={sourceGroupId}
              onChange={(e) => setSourceGroupId(e.target.value)}
              required
              className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
            >
              {filteredGroups.length === 0 ? (
                <option value="">No groups at this pen</option>
              ) : (
                filteredGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.total_head} hd) — {g.location_breadcrumb ?? "no loc"}
                  </option>
                ))
              )}
            </select>
          </div>

          {sourceGroup && sourceGroup.total_head > 0 ? (
            <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setHeadToMove(String(sourceGroup.total_head))}
                >
                  Move all ({sourceGroup.total_head})
                </Button>
              </div>
              <div>
                <Label htmlFor="headToMove">Head to move</Label>
                <Input
                  id="headToMove"
                  type="number"
                  min="1"
                  max={sourceGroup.total_head}
                  inputMode="numeric"
                  value={headToMove}
                  onChange={(e) => setHeadToMove(e.target.value)}
                  required
                  className="text-center text-xl font-bold tabular-nums"
                />
                <p className="mt-1 text-sm text-text-secondary">
                  {sourceGroup.total_head} available
                  {parsedHead > 0 && parsedHead < sourceGroup.total_head
                    ? " · partial move"
                    : parsedHead === sourceGroup.total_head
                      ? " · full move"
                      : ""}
                </p>
              </div>
              <div>
                <Label htmlFor="outWeightLbs">Outweight (optional)</Label>
                <Input
                  id="outWeightLbs"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={outWeightLbs}
                  onChange={(e) => setOutWeightLbs(e.target.value)}
                  placeholder="Total pounds on the truck"
                />
                {outWeightPerHead != null ? (
                  <p className="mt-1 text-sm text-text-secondary">
                    {outWeightPerHead.toLocaleString()} lb / head
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-text-secondary">
                    Updates source lot live average. Without a scale weight, lot average × head is
                    used.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-status-critical">Source group has no head to move.</p>
          )}
        </div>
      </Card>

      {operation === "move" ? (
      <Card>
        <CardHeader>
          <CardTitle>To</CardTitle>
          <CardDescription>
            Destination area and pen — LAORS merges into an existing group or creates one
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <CascadingLocationPicker
            idPrefix="dest"
            locationTree={locationTree}
            parentId={destParentId}
            subLocationId={destSubLocationId}
            onParentChange={setDestParentId}
            onSubLocationChange={setDestSubLocationId}
            parentLabel="Parent location"
            subLocationLabel="Sub-location"
            parentRequired
            subLocationRequired
          />
          {destParentId && !destinationLocationId ? (
            <p className="text-sm text-status-warning" role="status">
              Select a pen under this area to finish the move.
            </p>
          ) : null}
          {destGroups.length > 0 ? (
            <div>
              <Label htmlFor="destGroup">Destination group (optional)</Label>
              <select
                id="destGroup"
                value={destinationGroupId}
                onChange={(e) => setDestinationGroupId(e.target.value)}
                className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
              >
                <option value="">Auto (same name as source)</option>
                {destGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.total_head} hd)
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {movementReasonOptions.length > 0 ? (
            <div>
              <Label htmlFor="reason">Reason</Label>
              <select
                id="reason"
                value={reasonId}
                onChange={(e) => setReasonId(e.target.value)}
                className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
              >
                <option value="">Select reason (optional)</option>
                {movementReasonOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <Label htmlFor="moveNotes">Notes</Label>
            <Input
              id="moveNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Removal details</CardTitle>
            <CardDescription>
              No destination pen — head is deducted from the lot. Not a sale or death loss.
            </CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="removalReason">Reason</Label>
              <select
                id="removalReason"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value as ShippingReason)}
                className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
              >
                {Object.entries(SHIPPING_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="destinationName">Where they went (optional)</Label>
              <Input
                id="destinationName"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="Owner pickup, home ranch, etc."
              />
            </div>
            <div>
              <Label htmlFor="removeNotes">Notes</Label>
              <Input
                id="removeNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      <div>
        <Label htmlFor="movedAt">{operation === "move" ? "Move date" : "Removal date"}</Label>
        <Input
          id="movedAt"
          type="date"
          value={movedAt}
          onChange={(e) => setMovedAt(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-text-secondary">
          Used for billing head-days — set when the cattle actually moved, not necessarily today.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth size="xl" disabled={loading}>
        {loading
          ? operation === "move"
            ? "Moving…"
            : "Removing…"
          : operation === "move"
            ? `Move ${parsedHead || 0} Head`
            : `Remove ${parsedHead || 0} Head`}
      </Button>

      <Link href="/cattle" className="block text-center text-sm text-brown hover:underline">
        Cancel
      </Link>
    </form>
  );
}
