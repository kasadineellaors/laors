"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption, TreePickerOption } from "@/lib/locations/options";
import { CascadingLocationField } from "@/components/locations/cascading-location-field";
import {
  SHIPPING_DIRECTIONS,
  SHIPPING_DIRECTION_LABELS,
  SHIPPING_REASONS,
  SHIPPING_REASON_LABELS,
  type ShippingDirection,
  type ShippingReason,
} from "@/lib/cow-calf/shipping-constants";
import { saveCowCalfShipping } from "@/lib/actions/cow-calf-shipping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CowCalfShippingFormProps {
  orgId: string;
  herdOptions: SelectOption[];
  lotOptions: SelectOption[];
  locationTree: TreePickerOption[];
  defaultHerdId?: string;
  defaultLotId?: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function CowCalfShippingForm({
  orgId,
  herdOptions,
  lotOptions,
  locationTree,
  defaultHerdId,
  defaultLotId,
}: CowCalfShippingFormProps) {
  const router = useRouter();
  const [shippedAt, setShippedAt] = useState(new Date().toISOString().slice(0, 10));
  const [direction, setDirection] = useState<ShippingDirection>("out");
  const [headCount, setHeadCount] = useState("1");
  const [weightLbs, setWeightLbs] = useState("");
  const [herdId, setHerdId] = useState(defaultHerdId ?? "");
  const [lotId, setLotId] = useState(defaultLotId ?? "");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [reason, setReason] = useState<ShippingReason>("transfer");
  const [notes, setNotes] = useState("");
  const [adjustInventory, setAdjustInventory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const heads = parseInt(headCount, 10);
    if (Number.isNaN(heads) || heads <= 0) {
      setError("Enter head count");
      return;
    }
    if (
      direction === "out" &&
      adjustInventory &&
      !window.confirm(`Deduct ${heads} head from lot inventory?`)
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await saveCowCalfShipping(orgId, {
      shippedAt,
      direction,
      headCount: heads,
      weightLbs: weightLbs.trim() ? parseFloat(weightLbs) : undefined,
      cowCalfHerdId: herdId || undefined,
      cattleGroupId: lotId || undefined,
      sourceLocationId: sourceLocationId || undefined,
      destinationLocationId: destinationLocationId || undefined,
      sourceName,
      destinationName,
      reason,
      notes,
      adjustInventory: lotId ? adjustInventory : false,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/shipping");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ship cattle</CardTitle>
        <CardDescription>
          Document cattle moving in or out without creating a sale. Does not generate invoices.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" value={shippedAt} onChange={(e) => setShippedAt(e.target.value)} required />
          </div>
          <div>
            <Label>Direction</Label>
            <select
              className={selectClass}
              value={direction}
              onChange={(e) => setDirection(e.target.value as ShippingDirection)}
            >
              {SHIPPING_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {SHIPPING_DIRECTION_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Head count</Label>
            <Input
              type="number"
              min={1}
              value={headCount}
              onChange={(e) => setHeadCount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Weight (lb)</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={weightLbs}
              onChange={(e) => setWeightLbs(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Herd (optional)</Label>
            <select className={selectClass} value={herdId} onChange={(e) => setHerdId(e.target.value)}>
              <option value="">—</option>
              {herdOptions.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Stocker lot (optional)</Label>
            <select className={selectClass} value={lotId} onChange={(e) => setLotId(e.target.value)}>
              <option value="">—</option>
              {lotOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Source location</Label>
            <CascadingLocationField
              idPrefix="ship-source"
              locationTree={locationTree}
              value={sourceLocationId}
              onChange={setSourceLocationId}
              optional
            />
          </div>
          <div>
            <Label>Destination location</Label>
            <CascadingLocationField
              idPrefix="ship-dest"
              locationTree={locationTree}
              value={destinationLocationId}
              onChange={setDestinationLocationId}
              optional
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Source (free text)</Label>
            <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Ranch, lease, etc." />
          </div>
          <div>
            <Label>Destination (free text)</Label>
            <Input value={destinationName} onChange={(e) => setDestinationName(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Reason</Label>
          <select
            className={selectClass}
            value={reason}
            onChange={(e) => setReason(e.target.value as ShippingReason)}
          >
            {SHIPPING_REASONS.map((r) => (
              <option key={r} value={r}>
                {SHIPPING_REASON_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {lotId && direction === "out" ? (
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input
              type="checkbox"
              checked={adjustInventory}
              onChange={(e) => setAdjustInventory(e.target.checked)}
            />
            Deduct head from linked stocker lot inventory
          </label>
        ) : null}

        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-status-critical">{error}</p> : null}

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Saving…" : "Record shipping"}
        </Button>
      </form>
    </Card>
  );
}
