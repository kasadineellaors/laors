"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import { createCattleGroup } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CreateGroupFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  ownershipOptions: SelectOption[];
  customerOptions: SelectOption[];
}

export function CreateGroupForm({
  orgId,
  locationOptions,
  ownershipOptions,
  customerOptions,
}: CreateGroupFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState(locationOptions[0]?.value ?? "");
  const [ownershipGroupId, setOwnershipGroupId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const count = parseInt(headCount, 10);
    if (Number.isNaN(count) || count <= 0) {
      setError("Enter a head count greater than zero");
      setLoading(false);
      return;
    }

    const result = await createCattleGroup(
      orgId,
      name,
      locationId,
      count,
      notes || undefined,
      ownershipGroupId || undefined,
      customerId || undefined,
    );

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(result.groupId ? `/cattle/groups/${result.groupId}` : "/cattle");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New cattle group</CardTitle>
        <CardDescription>
          Groups live at a location. Head count rolls up on your ranch map automatically.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="groupName">Group name</Label>
          <Input
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Main Cow Herd"
          />
        </div>
        <div>
          <Label htmlFor="locationId">Location</Label>
          <select
            id="locationId"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
            className="flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base"
          >
            {locationOptions.length === 0 ? (
              <option value="">Add locations in Ranch Setup first</option>
            ) : (
              locationOptions.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))
            )}
          </select>
        </div>
        {ownershipOptions.length > 0 ? (
          <div>
            <Label htmlFor="ownershipGroup">Ownership group (optional)</Label>
            <select
              id="ownershipGroup"
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
            <Label htmlFor="customer">Billing customer (optional)</Label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base"
            >
              <option value="">None</option>
              {customerOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="headCount">Head count</Label>
          <Input
            id="headCount"
            type="number"
            min="1"
            inputMode="numeric"
            value={headCount}
            onChange={(e) => setHeadCount(e.target.value)}
            required
            placeholder="150"
            className="text-center text-xl font-bold tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={loading || !locationId}>
          {loading ? "Creating…" : "Create Group"}
        </Button>
      </form>
    </Card>
  );
}
