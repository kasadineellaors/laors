"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { BullRecord } from "@/lib/cow-calf/types";
import { createBull, updateBull } from "@/lib/actions/bulls";
import { ANIMAL_STATUS_LABELS } from "@/lib/cow-calf/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BullFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  bull?: BullRecord;
  onSuccess?: () => void;
}

export function BullForm({
  orgId,
  locationOptions,
  groupOptions,
  bull,
  onSuccess,
}: BullFormProps) {
  const router = useRouter();
  const isEdit = Boolean(bull);

  const [tagNumber, setTagNumber] = useState(bull?.tag_number ?? "");
  const [name, setName] = useState(bull?.name ?? "");
  const [groupId, setGroupId] = useState(bull?.cattle_group_id ?? "");
  const [locationId, setLocationId] = useState(bull?.location_id ?? "");
  const [birthDate, setBirthDate] = useState(bull?.birth_date ?? "");
  const [status, setStatus] = useState(bull?.status ?? "active");
  const [notes, setNotes] = useState(bull?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isEdit) {
      const result = await updateBull(orgId, bull!.id, {
        tagNumber,
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

    const result = await createBull(orgId, {
      tagNumber,
      name,
      cattleGroupId: groupId || undefined,
      locationId: locationId || undefined,
      birthDate: birthDate || undefined,
      notes,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.bullId) router.push(`/cow-calf/bulls/${result.bullId}`);
    else router.push("/cow-calf/bulls");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit bull" : "Register bull"}</CardTitle>
        <CardDescription>Individual bull tracking — tag, pasture, and status.</CardDescription>
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
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="touch-target w-full rounded-lg border border-border bg-surface px-3 py-2"
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
            className="touch-target w-full rounded-lg border border-border bg-surface px-3 py-2"
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
              onChange={(e) => setStatus(e.target.value as BullRecord["status"])}
              className="touch-target w-full rounded-lg border border-border bg-surface px-3 py-2"
            >
              {(Object.keys(ANIMAL_STATUS_LABELS) as BullRecord["status"][]).map((key) => (
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
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add bull"}
        </Button>
      </form>
    </Card>
  );
}
