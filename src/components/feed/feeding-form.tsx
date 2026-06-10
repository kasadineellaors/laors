"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type { FeedRationOption, FeedingContext, FeedingRecord } from "@/lib/feed/types";
import { createFeeding, updateFeeding } from "@/lib/actions/feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedingFormProps {
  orgId: string;
  rationOptions: FeedRationOption[];
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  ownerOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  feeding?: FeedingRecord;
  feedingContext?: FeedingContext;
  detailBasePath?: string;
  listPath?: string;
  onSuccess?: () => void;
}

export function FeedingForm({
  orgId,
  rationOptions,
  locationOptions,
  groupOptions,
  ownerOptions,
  memberOptions,
  feeding,
  feedingContext = "general",
  detailBasePath = "/feed/log",
  listPath = "/feed/log",
  onSuccess,
}: FeedingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(feeding);

  const [feedRationId, setFeedRationId] = useState(feeding?.feed_ration_id ?? rationOptions[0]?.id ?? "");
  const [quantity, setQuantity] = useState(feeding != null ? String(feeding.quantity) : "");
  const [fedAt, setFedAt] = useState(feeding?.fed_at ?? new Date().toISOString().slice(0, 10));
  const [groupId, setGroupId] = useState(feeding?.cattle_group_id ?? "");
  const [locationId, setLocationId] = useState(feeding?.location_id ?? "");
  const [ownerId, setOwnerId] = useState(feeding?.ownership_group_id ?? "");
  const [headCount, setHeadCount] = useState(
    feeding?.head_count != null ? String(feeding.head_count) : "",
  );
  const [fedBy, setFedBy] = useState(feeding?.fed_by ?? "");
  const [notes, setNotes] = useState(feeding?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedRation = rationOptions.find((r) => r.id === feedRationId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedQty = parseFloat(quantity);
    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      setError("Enter a valid feed amount");
      setLoading(false);
      return;
    }

    const parsedHead = headCount.trim() ? parseInt(headCount, 10) : undefined;
    if (headCount.trim() && (Number.isNaN(parsedHead!) || parsedHead! <= 0)) {
      setError("Head count must be a positive number");
      setLoading(false);
      return;
    }

    const payload = {
      feedRationId,
      quantity: parsedQty,
      fedAt,
      cattleGroupId: groupId || undefined,
      locationId: locationId || undefined,
      ownershipGroupId: ownerId || undefined,
      headCount: parsedHead,
      fedBy: fedBy || undefined,
      notes: notes || undefined,
      feedingContext,
    };

    const result = isEdit
      ? await updateFeeding(orgId, feeding!.id, {
          feedRationId,
          quantity: parsedQty,
          fedAt,
          cattleGroupId: groupId || null,
          locationId: locationId || null,
          ownershipGroupId: ownerId || null,
          headCount: parsedHead ?? null,
          fedBy: fedBy || null,
          notes: notes || null,
        })
      : await createFeeding(orgId, payload);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.feedingId) router.push(`${detailBasePath}/${result.feedingId}`);
    else router.push(listPath);
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  if (rationOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add rations first</CardTitle>
          <CardDescription>
            Create feed rations with names and prices, then log feed deliveries.
          </CardDescription>
        </CardHeader>
        <Button fullWidth onClick={() => router.push("/feed/rations/new")}>
          Create ration
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit feeding" : "Log feeding"}</CardTitle>
        <CardDescription>
          {feedingContext === "cow_calf"
            ? "Hay, supplement, or mineral for pairs and pastures"
            : "Pen, lot, or pasture — assign herd, owner, ration, and amount fed"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="ration">Feed ration</Label>
          <select
            id="ration"
            value={feedRationId}
            onChange={(e) => setFeedRationId(e.target.value)}
            className={selectClass}
            required
          >
            {rationOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.price_per_unit != null ? ` — $${r.price_per_unit}/${r.unit}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="quantity">Amount fed ({selectedRation?.unit ?? "units"})</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={fedAt}
              onChange={(e) => setFedAt(e.target.value)}
              required
            />
          </div>
        </div>
        {locationOptions.length > 0 ? (
          <div>
            <Label htmlFor="location">Pen / lot / pasture</Label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select location</option>
              {locationOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {groupOptions.length > 0 ? (
          <div>
            <Label htmlFor="group">Herd / cattle group</Label>
            <select
              id="group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {groupOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {ownerOptions.length > 0 ? (
          <div>
            <Label htmlFor="owner">Owner</Label>
            <select
              id="owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={selectClass}
            >
              <option value="">Ranch-owned / none</option>
              {ownerOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="headCount">Head fed (optional)</Label>
            <Input
              id="headCount"
              type="number"
              min={1}
              value={headCount}
              onChange={(e) => setHeadCount(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {memberOptions.length > 0 ? (
            <div>
              <Label htmlFor="fedBy">Fed by</Label>
              <select
                id="fedBy"
                value={fedBy}
                onChange={(e) => setFedBy(e.target.value)}
                className={selectClass}
              >
                <option value="">Me</option>
                {memberOptions.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Log feeding"}
        </Button>
      </form>
    </Card>
  );
}
