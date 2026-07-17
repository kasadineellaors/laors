"use client";

import { useState } from "react";
import { createProperty, createLocationUnderParent } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import type { SelectOption } from "@/lib/locations/options";

interface AddLocationFormProps {
  orgId: string;
  propertyOptions: SelectOption[];
  locationTypeOptions: SelectOption[];
  onCreated?: () => void;
}

interface FieldErrors {
  acres?: string;
  capacity?: string;
  parentId?: string;
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

export function AddLocationForm({
  orgId,
  propertyOptions,
  locationTypeOptions,
  onCreated,
}: AddLocationFormProps) {
  const [mode, setMode] = useState<"property" | "location">("property");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const acresRaw = (fd.get("acres") as string) ?? "";
    const capacityRaw = (fd.get("capacity") as string) ?? "";
    const parentId = (fd.get("parentId") as string) ?? "";

    const nextFieldErrors: FieldErrors = {
      acres: validateAcres(acresRaw),
      capacity: validateCapacity(capacityRaw),
    };
    if (mode === "location" && !parentId) {
      nextFieldErrors.parentId = "Select a parent property or location.";
    }
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;

    setLoading(true);
    const acres = acresRaw.trim() ? Number(acresRaw) : undefined;
    const capacity = capacityRaw.trim() ? Number(capacityRaw) : undefined;

    let result;
    if (mode === "property") {
      result = await createProperty(orgId, name, acres, capacity);
    } else {
      const typeId = (fd.get("locationTypeId") as string) || undefined;
      result = await createLocationUnderParent(
        orgId,
        parentId,
        name,
        typeId,
        acres,
        capacity,
      );
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    (e.target as HTMLFormElement).reset();
    setFieldErrors({});
    setLoading(false);
    onCreated?.();
  }

  return (
    <section
      aria-labelledby="add-structure-heading"
      className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]"
    >
      <h2 id="add-structure-heading" className="text-lg font-bold text-navy">
        Add Property or Location
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Properties are top-level ranch areas. Locations are pastures, pens, traps, sections, or
        other areas nested beneath them.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Structure type">
        <Button
          type="button"
          variant={mode === "property" ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setMode("property");
            setFieldErrors({});
          }}
          aria-pressed={mode === "property"}
        >
          Property
        </Button>
        <Button
          type="button"
          variant={mode === "location" ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setMode("location");
            setFieldErrors({});
          }}
          disabled={propertyOptions.length === 0}
          aria-pressed={mode === "location"}
        >
          Location
        </Button>
      </div>

      <p className="mt-3 text-sm text-text-secondary">
        {mode === "property"
          ? "Add a top-level ranch property."
          : "Add a location beneath an existing property or location."}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {mode === "location" ? (
          <>
            <div>
              <Label htmlFor="parentId">Parent property or location</Label>
              <select
                id="parentId"
                name="parentId"
                required
                aria-invalid={fieldErrors.parentId ? true : undefined}
                aria-describedby={fieldErrors.parentId ? "parentId-error" : undefined}
                className={cn(
                  "flex h-12 w-full rounded-lg border-2 bg-surface-white px-4 text-base",
                  fieldErrors.parentId ? "border-status-critical" : "border-border-neutral",
                )}
              >
                <option value="">Select parent</option>
                {propertyOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {fieldErrors.parentId ? (
                <p id="parentId-error" className="mt-1 text-sm text-status-critical" role="alert">
                  {fieldErrors.parentId}
                </p>
              ) : null}
            </div>
            {locationTypeOptions.length > 0 ? (
              <div>
                <Label htmlFor="locationTypeId">Location type</Label>
                <select
                  id="locationTypeId"
                  name="locationTypeId"
                  className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
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
          <Label htmlFor="name">
            {mode === "property" ? "Property name" : "Location name"}
          </Label>
          <Input
            id="name"
            name="name"
            required
            placeholder={mode === "property" ? "Property 1" : "Pasture 1"}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="acres">Acres (optional)</Label>
            <Input
              id="acres"
              name="acres"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={fieldErrors.acres ? true : undefined}
              aria-describedby={fieldErrors.acres ? "acres-error" : undefined}
            />
            {fieldErrors.acres ? (
              <p id="acres-error" className="mt-1 text-sm text-status-critical" role="alert">
                {fieldErrors.acres}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="capacity">Capacity in head (optional)</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="0"
              step="1"
              aria-invalid={fieldErrors.capacity ? true : undefined}
              aria-describedby={fieldErrors.capacity ? "capacity-error" : undefined}
            />
            {fieldErrors.capacity ? (
              <p id="capacity-error" className="mt-1 text-sm text-status-critical" role="alert">
                {fieldErrors.capacity}
              </p>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : mode === "property" ? "Add Property" : "Add Location"}
        </Button>
      </form>
    </section>
  );
}
