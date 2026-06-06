"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationTreeNode } from "@/lib/locations/types";
import { updateLocation, archiveLocation } from "@/lib/actions/ranch-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EditLocationPanelProps {
  orgId: string;
  location: LocationTreeNode;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditLocationPanel({
  orgId,
  location,
  onClose,
  onUpdated,
}: EditLocationPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(location.name);
  const [acres, setAcres] = useState(location.acres?.toString() ?? "");
  const [capacity, setCapacity] = useState(location.capacity_head?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await updateLocation(orgId, location.id, {
      name,
      acres: acres ? Number(acres) : null,
      capacityHead: capacity ? Number(capacity) : null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onUpdated();
    router.refresh();
  }

  async function handleArchive() {
    if (
      !window.confirm(
        `Archive "${location.name}"? It will be hidden from the map. Sub-locations must be archived first.`,
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await archiveLocation(orgId, location.id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    onUpdated();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit location</CardTitle>
        <CardDescription>
          {location.location_type.name} · depth {location.depth} · {location.head_count} head
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Label htmlFor="editName">Name</Label>
          <Input
            id="editName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="editAcres">Acres</Label>
            <Input
              id="editAcres"
              type="number"
              step="0.01"
              min="0"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="editCapacity">Capacity head</Label>
            <Input
              id="editCapacity"
              type="number"
              min="0"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button
            type="button"
            variant="danger"
            className="ml-auto"
            onClick={handleArchive}
            disabled={loading}
          >
            Archive
          </Button>
        </div>
      </form>
    </Card>
  );
}
