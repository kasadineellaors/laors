"use client";

import { useState } from "react";
import { createProperty, createLocationUnderParent } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SelectOption } from "@/lib/locations/options";

interface AddLocationFormProps {
  orgId: string;
  propertyOptions: SelectOption[];
  locationTypeOptions: SelectOption[];
  onCreated?: () => void;
}

export function AddLocationForm({
  orgId,
  propertyOptions,
  locationTypeOptions,
  onCreated,
}: AddLocationFormProps) {
  const [mode, setMode] = useState<"property" | "location">("property");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const acres = fd.get("acres") ? Number(fd.get("acres")) : undefined;
    const capacity = fd.get("capacity") ? Number(fd.get("capacity")) : undefined;

    let result;
    if (mode === "property") {
      result = await createProperty(orgId, name, acres, capacity);
    } else {
      const parentId = fd.get("parentId") as string;
      const typeId = (fd.get("locationTypeId") as string) || undefined;
      result = await createLocationUnderParent(orgId, parentId, name, typeId, acres, capacity);
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    (e.target as HTMLFormElement).reset();
    setLoading(false);
    onCreated?.();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add to your ranch map</CardTitle>
        <CardDescription>
          Properties are top-level. Locations and sub-locations nest underneath.
        </CardDescription>
      </CardHeader>
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          variant={mode === "property" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("property")}
        >
          Property
        </Button>
        <Button
          type="button"
          variant={mode === "location" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("location")}
          disabled={propertyOptions.length === 0}
        >
          Location
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "location" ? (
          <>
            <div>
              <Label htmlFor="parentId">Under property or location</Label>
              <select
                id="parentId"
                name="parentId"
                required
                className="flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base"
              >
                <option value="">Select parent</option>
                {propertyOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {locationTypeOptions.length > 0 ? (
              <div>
                <Label htmlFor="locationTypeId">Type</Label>
                <select
                  id="locationTypeId"
                  name="locationTypeId"
                  className="flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base"
                >
                  {locationTypeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        ) : null}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Home Place" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="acres">Acres (optional)</Label>
            <Input id="acres" name="acres" type="number" step="0.01" min="0" />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity head (optional)</Label>
            <Input id="capacity" name="capacity" type="number" min="0" />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : mode === "property" ? "Add Property" : "Add Location"}
        </Button>
      </form>
    </Card>
  );
}
