"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import type { SelectOption } from "@/lib/locations/options";
import {
  archiveCattleGroup,
  setGroupHeadCount,
  updateCattleGroup,
} from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GroupDetailClientProps {
  orgId: string;
  group: CattleGroupSummary;
  adjustmentReasonOptions: SelectOption[];
  ownershipOptions: SelectOption[];
  customerOptions: SelectOption[];
  canManageCattle: boolean;
}

export function GroupDetailClient({
  orgId,
  group,
  adjustmentReasonOptions,
  ownershipOptions,
  customerOptions,
  canManageCattle,
}: GroupDetailClientProps) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [notes, setNotes] = useState(group.notes ?? "");
  const [ownershipGroupId, setOwnershipGroupId] = useState(group.ownership_group_id ?? "");
  const [customerId, setCustomerId] = useState(group.customer_id ?? "");
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingCount, setEditingCount] = useState(false);
  const [headCount, setHeadCount] = useState(String(group.total_head));
  const [adjustReasonId, setAdjustReasonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveMeta() {
    setLoading(true);
    setError(null);
    const result = await updateCattleGroup(orgId, group.id, {
      name,
      notes,
      ownershipGroupId: ownershipGroupId || null,
      customerId: customerId || null,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setEditingMeta(false);
      router.refresh();
    }
  }

  async function saveHeadCount() {
    const newCount = parseInt(headCount, 10);
    if (Number.isNaN(newCount) || newCount < 0) {
      setError("Enter a valid head count");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await setGroupHeadCount(
      orgId,
      group.id,
      newCount,
      adjustReasonId || undefined,
    );
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setEditingCount(false);
      router.refresh();
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archive "${group.name}"?`)) return;
    setLoading(true);
    const result = await archiveCattleGroup(orgId, group.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cattle");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cattle" className="text-sm font-medium text-olive hover:underline">
          ← Cattle
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">{group.name}</h1>
        <p className="text-charcoal/70">{group.location_breadcrumb ?? "No location"}</p>
        {group.ownership_group_name ? (
          <p className="text-sm text-charcoal/60">Owner: {group.ownership_group_name}</p>
        ) : null}
        {group.customer_name ? (
          <p className="text-sm text-charcoal/60">Billing customer: {group.customer_name}</p>
        ) : null}
        <p className="mt-1 text-3xl font-bold text-olive">{group.total_head} head</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {canManageCattle ? (
          <Link href={`/cattle/move?from=${group.id}`}>
            <Button fullWidth size="lg">
              Move Cattle
            </Button>
          </Link>
        ) : null}
        {canManageCattle ? (
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => setEditingMeta((v) => !v)}
          >
            Edit Group
          </Button>
        ) : null}
      </div>

      {canManageCattle && editingMeta ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit group</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="editNotes">Notes</Label>
              <Input id="editNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {ownershipOptions.length > 0 ? (
              <div>
                <Label htmlFor="editOwnership">Ownership group</Label>
                <select
                  id="editOwnership"
                  value={ownershipGroupId}
                  onChange={(e) => setOwnershipGroupId(e.target.value)}
                  className="flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base"
                >
                  <option value="">Ranch-owned / none</option>
                  {ownershipOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {customerOptions.length > 0 ? (
              <div>
                <Label htmlFor="editCustomer">Billing customer</Label>
                <select
                  id="editCustomer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base"
                >
                  <option value="">None — not on a customer invoice</option>
                  {customerOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button onClick={saveMeta} disabled={loading}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditingMeta(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Head count</CardTitle>
          <CardDescription>Total head in this group</CardDescription>
        </CardHeader>
        {editingCount ? (
          <div className="space-y-3">
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={headCount}
              onChange={(e) => setHeadCount(e.target.value)}
              className="text-center text-xl font-bold tabular-nums"
              autoFocus
            />
            {adjustmentReasonOptions.length > 0 ? (
              <select
                value={adjustReasonId}
                onChange={(e) => setAdjustReasonId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Reason for change (optional)</option>
                {adjustmentReasonOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="flex gap-2">
              <Button onClick={saveHeadCount} disabled={loading}>
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingCount(false);
                  setHeadCount(String(group.total_head));
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-4xl font-bold text-olive">{group.total_head}</p>
            {canManageCattle ? (
              <Button variant="outline" onClick={() => setEditingCount(true)}>
                Edit count
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      {canManageCattle ? (
        <Button variant="danger" fullWidth onClick={handleArchive} disabled={loading}>
          Archive Group
        </Button>
      ) : null}
    </div>
  );
}
