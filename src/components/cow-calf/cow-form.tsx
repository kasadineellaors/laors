"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { CowAnimalType, CowRecord } from "@/lib/cow-calf/types";
import { createCow, updateCow } from "@/lib/actions/cows";
import { ANIMAL_STATUS_LABELS, COW_TYPE_LABELS } from "@/lib/cow-calf/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CowFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  cow?: CowRecord;
  onSuccess?: () => void;
}

export function CowForm({ orgId, locationOptions, groupOptions, cow, onSuccess }: CowFormProps) {
  const router = useRouter();
  const isEdit = Boolean(cow);

  const [tagNumber, setTagNumber] = useState(cow?.tag_number ?? "");
  const [animalType, setAnimalType] = useState<CowAnimalType>(cow?.animal_type ?? "cow");
  const [name, setName] = useState(cow?.name ?? "");
  const [groupId, setGroupId] = useState(cow?.cattle_group_id ?? "");
  const [locationId, setLocationId] = useState(cow?.location_id ?? "");
  const [birthDate, setBirthDate] = useState(cow?.birth_date ?? "");
  const [status, setStatus] = useState(cow?.status ?? "active");
  const [notes, setNotes] = useState(cow?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isEdit) {
      const result = await updateCow(orgId, cow!.id, {
        tagNumber,
        animalType,
        name: name || null,
        cattleGroupId: groupId || null,
        locationId: locationId || null,
        status,
        birthDate: birthDate || null,
        notes: notes || null,
      });
      setLoading(false);
      if (result.error) setError(result.error);
      else if (onSuccess) onSuccess();
      else router.refresh();
      return;
    }

    const result = await createCow(orgId, {
      tagNumber,
      animalType,
      name,
      cattleGroupId: groupId || undefined,
      locationId: locationId || undefined,
      birthDate: birthDate || undefined,
      notes,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.cowId) router.push(`/cow-calf/cows/${result.cowId}`);
    else router.push("/cow-calf/cows");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit cow" : "Register cow"}</CardTitle>
        <CardDescription>Individual cow or heifer — tag, pasture, and herd.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tagNumber">Tag number</Label>
            <Input
              id="tagNumber"
              value={tagNumber}
              onChange={(e) => setTagNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="animalType">Type</Label>
            <select
              id="animalType"
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value as CowAnimalType)}
              className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
            >
              {(Object.keys(COW_TYPE_LABELS) as CowAnimalType[]).map((key) => (
                <option key={key} value={key}>
                  {COW_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="name">Name (optional)</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="location">Pasture / location</Label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
          >
            <option value="">— Optional —</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="group">Herd group</Label>
          <select
            id="group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
          >
            <option value="">— Optional —</option>
            {groupOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {isEdit ? (
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CowRecord["status"])}
              className="touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2"
            >
              {(Object.keys(ANIMAL_STATUS_LABELS) as CowRecord["status"][]).map((key) => (
                <option key={key} value={key}>
                  {ANIMAL_STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <Label htmlFor="birthDate">Birth date</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Register cow"}
        </Button>
      </form>
    </Card>
  );
}
