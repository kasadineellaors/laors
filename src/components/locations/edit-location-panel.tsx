"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LocationTreeNode } from "@/lib/locations/types";
import type { LocationCattleGroup } from "@/lib/locations/rollups";
import { updateLocation, archiveLocation } from "@/lib/actions/ranch-config";
import { formatNodeCapacity, getLocationTypeLabel } from "@/lib/locations/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditLocationPanelProps {
  orgId: string;
  location: LocationTreeNode;
  parentName: string | null;
  cattleGroups: LocationCattleGroup[];
  onClose: () => void;
  onUpdated: () => void;
}

function validateAcres(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) return "Enter a valid number of acres.";
  if (num < 0) return "Acres must be zero or greater.";
  return undefined;
}

function validateCapacity(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isInteger(num)) {
    return "Capacity must be a whole number.";
  }
  if (num < 0) return "Capacity must be zero or greater.";
  return undefined;
}

export function EditLocationPanel({
  orgId,
  location,
  parentName,
  cattleGroups,
  onClose,
  onUpdated,
}: EditLocationPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(location.name);
  const [acres, setAcres] = useState(location.acres?.toString() ?? "");
  const [capacity, setCapacity] = useState(location.capacity_head?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [acresError, setAcresError] = useState<string | undefined>();
  const [capacityError, setCapacityError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const typeLabel = getLocationTypeLabel(
    location.location_type.tier,
    location.location_type.name,
  );
  const capacityDisplay = formatNodeCapacity(location);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const nextAcresError = validateAcres(acres);
    const nextCapacityError = validateCapacity(capacity);
    setAcresError(nextAcresError);
    setCapacityError(nextCapacityError);
    if (nextAcresError || nextCapacityError) return;

    setLoading(true);
    setError(null);
    const result = await updateLocation(orgId, location.id, {
      name,
      acres: acres.trim() ? Number(acres) : null,
      capacityHead: capacity.trim() ? Number(capacity) : null,
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
    <section
      aria-labelledby="edit-location-heading"
      className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]"
    >
      <h2 id="edit-location-heading" className="text-lg font-bold text-navy">
        Edit {location.location_type.tier === "property" ? "property" : "location"}
      </h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-secondary">Type</dt>
          <dd className="font-medium text-navy">{typeLabel}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Parent</dt>
          <dd className="font-medium text-navy">{parentName ?? "Top-level property"}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Current head count</dt>
          <dd className="font-semibold tabular-nums text-navy">{location.head_count} head</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Capacity</dt>
          <dd className="font-medium text-navy">
            {capacityDisplay.primary}
            {capacityDisplay.secondary ? (
              <span className="block text-text-secondary">{capacityDisplay.secondary}</span>
            ) : null}
          </dd>
        </div>
      </dl>

      {location.children.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-navy">Child locations</h3>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {location.children.map((child) => (
              <li key={child.id}>
                {child.name} · {getLocationTypeLabel(child.location_type.tier, child.location_type.name)} ·{" "}
                {child.head_count} head
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {cattleGroups.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-navy">Linked cattle groups</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {cattleGroups.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/cattle/groups/${group.id}`}
                  className="font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
                >
                  {group.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={handleSave} className="mt-5 space-y-4 border-t border-border-neutral pt-5">
        <div>
          <Label htmlFor="editName">Name</Label>
          <Input
            id="editName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="editAcres">Acres (optional)</Label>
            <Input
              id="editAcres"
              type="number"
              step="0.01"
              min="0"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
              aria-invalid={acresError ? true : undefined}
              aria-describedby={acresError ? "editAcres-error" : undefined}
            />
            {acresError ? (
              <p id="editAcres-error" className="mt-1 text-sm text-status-critical" role="alert">
                {acresError}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="editCapacity">Capacity in head (optional)</Label>
            <Input
              id="editCapacity"
              type="number"
              min="0"
              step="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              aria-invalid={capacityError ? true : undefined}
              aria-describedby={capacityError ? "editCapacity-error" : undefined}
            />
            {capacityError ? (
              <p id="editCapacity-error" className="mt-1 text-sm text-status-critical" role="alert">
                {capacityError}
              </p>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="text-sm text-status-critical" role="alert">
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
    </section>
  );
}
