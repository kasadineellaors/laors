"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { SeedstockAnimalRecord, SeedstockAnimalType } from "@/lib/seedstock/types";
import { createSeedstockAnimal, updateSeedstockAnimal } from "@/lib/actions/seedstock-animals";
import { ANIMAL_STATUS_LABELS, SEEDSTOCK_TYPE_LABELS } from "@/lib/seedstock/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SeedstockAnimalFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  animal?: SeedstockAnimalRecord;
  onSuccess?: () => void;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border bg-surface px-3 py-2";

export function SeedstockAnimalForm({
  orgId,
  locationOptions,
  groupOptions,
  animal,
  onSuccess,
}: SeedstockAnimalFormProps) {
  const router = useRouter();
  const isEdit = Boolean(animal);

  const [tagNumber, setTagNumber] = useState(animal?.tag_number ?? "");
  const [name, setName] = useState(animal?.name ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(animal?.registration_number ?? "");
  const [animalType, setAnimalType] = useState<SeedstockAnimalType>(animal?.animal_type ?? "bull");
  const [breed, setBreed] = useState(animal?.breed ?? "");
  const [birthDate, setBirthDate] = useState(animal?.birth_date ?? "");
  const [sireTag, setSireTag] = useState(animal?.sire_tag ?? "");
  const [damTag, setDamTag] = useState(animal?.dam_tag ?? "");
  const [pedigree, setPedigree] = useState(animal?.pedigree ?? "");
  const [epdBw, setEpdBw] = useState(animal?.epd_birth_weight?.toString() ?? "");
  const [epdWw, setEpdWw] = useState(animal?.epd_weaning_weight?.toString() ?? "");
  const [epdYw, setEpdYw] = useState(animal?.epd_yearling_weight?.toString() ?? "");
  const [epdMilk, setEpdMilk] = useState(animal?.epd_milk?.toString() ?? "");
  const [epdCea, setEpdCea] = useState(animal?.epd_cea?.toString() ?? "");
  const [epdDoc, setEpdDoc] = useState(animal?.epd_doc?.toString() ?? "");
  const [epdScrotal, setEpdScrotal] = useState(animal?.epd_scrotal?.toString() ?? "");
  const [epdMarbling, setEpdMarbling] = useState(animal?.epd_marbling?.toString() ?? "");
  const [groupId, setGroupId] = useState(animal?.cattle_group_id ?? "");
  const [locationId, setLocationId] = useState(animal?.location_id ?? "");
  const [status, setStatus] = useState(animal?.status ?? "active");
  const [notes, setNotes] = useState(animal?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      tagNumber,
      name: name || undefined,
      registrationNumber: registrationNumber || undefined,
      animalType,
      breed: breed || undefined,
      birthDate: birthDate || undefined,
      sireTag: sireTag || undefined,
      damTag: damTag || undefined,
      pedigree: pedigree || undefined,
      epdBirthWeight: epdBw || undefined,
      epdWeaningWeight: epdWw || undefined,
      epdYearlingWeight: epdYw || undefined,
      epdMilk: epdMilk || undefined,
      epdCea: epdCea || undefined,
      epdDoc: epdDoc || undefined,
      epdScrotal: epdScrotal || undefined,
      epdMarbling: epdMarbling || undefined,
      cattleGroupId: groupId || undefined,
      locationId: locationId || undefined,
      notes: notes || undefined,
    };

    if (isEdit) {
      const result = await updateSeedstockAnimal(orgId, animal!.id, {
        ...payload,
        name: name || null,
        registrationNumber: registrationNumber || null,
        breed: breed || null,
        birthDate: birthDate || null,
        sireTag: sireTag || null,
        damTag: damTag || null,
        pedigree: pedigree || null,
        epdBirthWeight: epdBw || null,
        epdWeaningWeight: epdWw || null,
        epdYearlingWeight: epdYw || null,
        epdMilk: epdMilk || null,
        epdCea: epdCea || null,
        epdDoc: epdDoc || null,
        epdScrotal: epdScrotal || null,
        epdMarbling: epdMarbling || null,
        cattleGroupId: groupId || null,
        locationId: locationId || null,
        status,
        notes: notes || null,
      });
      setLoading(false);
      if (result.error) setError(result.error);
      else if (onSuccess) onSuccess();
      else router.refresh();
      return;
    }

    const result = await createSeedstockAnimal(orgId, payload);
    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.animalId) router.push(`/seedstock/animals/${result.animalId}`);
    else router.push("/seedstock/animals");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit animal" : "Register seedstock animal"}</CardTitle>
        <CardDescription>Tag, registration, pedigree, and EPDs for your program.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tagNumber">Animal ID / tag</Label>
            <Input
              id="tagNumber"
              value={tagNumber}
              onChange={(e) => setTagNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="registrationNumber">Registration #</Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="animalType">Sex / type</Label>
            <select
              id="animalType"
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value as SeedstockAnimalType)}
              className={selectClass}
            >
              {(Object.keys(SEEDSTOCK_TYPE_LABELS) as SeedstockAnimalType[]).map((key) => (
                <option key={key} value={key}>
                  {SEEDSTOCK_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="breed">Breed</Label>
            <Input id="breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birthDate">Date of birth</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sireTag">Sire</Label>
            <Input id="sireTag" value={sireTag} onChange={(e) => setSireTag(e.target.value)} placeholder="Tag or name" />
          </div>
          <div>
            <Label htmlFor="damTag">Dam</Label>
            <Input id="damTag" value={damTag} onChange={(e) => setDamTag(e.target.value)} placeholder="Tag or name" />
          </div>
        </div>

        <div>
          <Label htmlFor="pedigree">Pedigree notes</Label>
          <Input id="pedigree" value={pedigree} onChange={(e) => setPedigree(e.target.value)} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-charcoal">EPDs</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="epdBw">Birth wt</Label>
              <Input id="epdBw" type="number" step="0.1" value={epdBw} onChange={(e) => setEpdBw(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="epdWw">Weaning wt</Label>
              <Input id="epdWw" type="number" step="0.1" value={epdWw} onChange={(e) => setEpdWw(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="epdYw">Yearling wt</Label>
              <Input id="epdYw" type="number" step="0.1" value={epdYw} onChange={(e) => setEpdYw(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="epdMilk">Milk</Label>
              <Input id="epdMilk" type="number" step="0.1" value={epdMilk} onChange={(e) => setEpdMilk(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="epdCea">CEA</Label>
              <Input id="epdCea" type="number" step="0.1" value={epdCea} onChange={(e) => setEpdCea(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="epdDoc">DOC</Label>
              <Input id="epdDoc" type="number" step="0.1" value={epdDoc} onChange={(e) => setEpdDoc(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="epdScrotal">Scrotal</Label>
              <Input id="epdScrotal" type="number" step="0.1" value={epdScrotal} onChange={(e) => setEpdScrotal(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="epdMarbling">Marbling</Label>
              <Input id="epdMarbling" type="number" step="0.1" value={epdMarbling} onChange={(e) => setEpdMarbling(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className={selectClass}
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
            className={selectClass}
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
              onChange={(e) => setStatus(e.target.value as SeedstockAnimalRecord["status"])}
              className={selectClass}
            >
              {(Object.keys(ANIMAL_STATUS_LABELS) as SeedstockAnimalRecord["status"][]).map((key) => (
                <option key={key} value={key}>
                  {ANIMAL_STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

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
          {loading ? "Saving…" : isEdit ? "Save changes" : "Register animal"}
        </Button>
      </form>
    </Card>
  );
}
