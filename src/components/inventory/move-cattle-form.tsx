"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import type { SelectOption } from "@/lib/locations/options";
import { executeCattleMove, fetchGroupsAtLocation } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MoveCattleFormProps {
  orgId: string;
  groups: CattleGroupSummary[];
  locationOptions: SelectOption[];
  movementReasonOptions: SelectOption[];
  initialSourceGroupId?: string;
}

export function MoveCattleForm({
  orgId,
  groups,
  locationOptions,
  movementReasonOptions,
  initialSourceGroupId,
}: MoveCattleFormProps) {
  const router = useRouter();
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [sourceGroupId, setSourceGroupId] = useState(
    initialSourceGroupId ?? groups[0]?.id ?? "",
  );
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [destinationGroupId, setDestinationGroupId] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [notes, setNotes] = useState("");
  const [headToMove, setHeadToMove] = useState("");
  const [destGroups, setDestGroups] = useState<
    { id: string; name: string; total_head: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!sourceLocationId) return groups;
    return groups.filter((g) => g.location_id === sourceLocationId);
  }, [groups, sourceLocationId]);

  const sourceGroup = useMemo(
    () => filteredGroups.find((g) => g.id === sourceGroupId) ?? groups.find((g) => g.id === sourceGroupId),
    [filteredGroups, groups, sourceGroupId],
  );

  useEffect(() => {
    if (initialSourceGroupId) {
      const g = groups.find((gr) => gr.id === initialSourceGroupId);
      if (g?.location_id) setSourceLocationId(g.location_id);
    }
  }, [initialSourceGroupId, groups]);

  useEffect(() => {
    if (!sourceLocationId) return;
    if (sourceGroup && sourceGroup.location_id === sourceLocationId) return;
    const first = filteredGroups[0];
    setSourceGroupId(first?.id ?? "");
  }, [sourceLocationId, filteredGroups, sourceGroup]);

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
    if (!sourceGroup) return;

    const count = parseInt(headToMove, 10);
    if (Number.isNaN(count) || count <= 0) {
      setError("Enter how many head to move");
      return;
    }
    if (count > sourceGroup.total_head) {
      setError(`Only ${sourceGroup.total_head} head available`);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await executeCattleMove(orgId, {
      sourceGroupId,
      destinationLocationId,
      destinationGroupId: destinationGroupId || undefined,
      movementReasonId: reasonId || undefined,
      notes: notes || undefined,
      headToMove: count,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/cattle/moves");
    router.refresh();
  }

  const parsedHead = parseInt(headToMove, 10) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>From</CardTitle>
          <CardDescription>Pick a pen, then the group and head count to move</CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="sourcePen">Source pen / location (optional)</Label>
            <select
              id="sourcePen"
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
            >
              <option value="">All locations</option>
              {locationOptions.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
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
            </>
          ) : (
            <p className="text-sm text-status-critical">Source group has no head to move.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To</CardTitle>
          <CardDescription>
            Destination pen and group — LAORS merges into an existing group or creates one
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="destLoc">Destination pen / location</Label>
            <select
              id="destLoc"
              value={destinationLocationId}
              onChange={(e) => setDestinationLocationId(e.target.value)}
              required
              className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
            >
              <option value="">Select location</option>
              {locationOptions.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
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

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        fullWidth
        size="xl"
        disabled={
          loading ||
          parsedHead <= 0 ||
          !destinationLocationId ||
          !sourceGroup?.total_head
        }
      >
        {loading ? "Moving…" : `Move ${parsedHead || 0} Head`}
      </Button>

      <Link href="/cattle" className="block text-center text-sm text-brown hover:underline">
        Cancel
      </Link>
    </form>
  );
}
