"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { CowCalfSaleType } from "@/lib/cow-calf/exit-types";
import { COW_CALF_SALE_TYPE_LABELS } from "@/lib/cow-calf/constants";
import { saveCowCalfSale } from "@/lib/actions/cow-calf-sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimalOption {
  value: string;
  label: string;
  animalType: string;
}

interface CowCalfSaleFormProps {
  orgId: string;
  herdOptions: SelectOption[];
  locationOptions: SelectOption[];
  animalOptions: AnimalOption[];
  defaultHerdId?: string;
}

const selectClass =
  "touch-target w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2";

export function CowCalfSaleForm({
  orgId,
  herdOptions,
  locationOptions,
  animalOptions,
  defaultHerdId,
}: CowCalfSaleFormProps) {
  const router = useRouter();
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [buyer, setBuyer] = useState("");
  const [saleType, setSaleType] = useState<CowCalfSaleType>("calf");
  const [herdId, setHerdId] = useState(defaultHerdId ?? "");
  const [locationId, setLocationId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [fees, setFees] = useState("");
  const [avgWeight, setAvgWeight] = useState("");
  const [saleReason, setSaleReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleAnimal(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await saveCowCalfSale(orgId, {
      saleDate,
      buyerName: buyer,
      cowCalfHerdId: herdId || undefined,
      locationId: locationId || undefined,
      animalIds: selected,
      cowCalfSaleType: saleType,
      totalAmount: totalAmount ? Number.parseFloat(totalAmount) : undefined,
      fees: fees ? Number.parseFloat(fees) : undefined,
      avgWeightLbs: avgWeight ? Number.parseFloat(avgWeight) : undefined,
      saleReason,
      notes,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/cow-calf/sales");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record sale</CardTitle>
        <CardDescription>
          Cow-calf sales update animal status and end nursing pairs without touching Stocker inventory.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Sale date</Label>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
          </div>
          <div>
            <Label>Sale type</Label>
            <select className={selectClass} value={saleType} onChange={(e) => setSaleType(e.target.value as CowCalfSaleType)}>
              {(Object.keys(COW_CALF_SALE_TYPE_LABELS) as CowCalfSaleType[]).map((key) => (
                <option key={key} value={key}>{COW_CALF_SALE_TYPE_LABELS[key]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Buyer</Label>
          <Input value={buyer} onChange={(e) => setBuyer(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Herd</Label>
            <select className={selectClass} value={herdId} onChange={(e) => setHerdId(e.target.value)}>
              <option value="">—</option>
              {herdOptions.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Location</Label>
            <select className={selectClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">—</option>
              {locationOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Gross ($)</Label>
            <Input type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          </div>
          <div>
            <Label>Fees ($)</Label>
            <Input type="number" min="0" step="0.01" value={fees} onChange={(e) => setFees(e.target.value)} />
          </div>
          <div>
            <Label>Avg weight (lb)</Label>
            <Input type="number" min="0" value={avgWeight} onChange={(e) => setAvgWeight(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Reason / notes</Label>
          <Input value={saleReason} onChange={(e) => setSaleReason(e.target.value)} placeholder="Cull, feeder, etc." />
        </div>

        <div>
          <Label>Animals ({selected.length})</Label>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border-neutral p-2">
            {animalOptions.map((animal) => (
              <li key={animal.value}>
                <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-tan/20">
                  <input
                    type="checkbox"
                    checked={selected.includes(animal.value)}
                    onChange={() => toggleAnimal(animal.value)}
                    className="size-5 accent-olive"
                  />
                  <span className="text-sm font-medium text-navy">{animal.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-status-critical">{error}</p> : null}

        <Button type="submit" size="lg" disabled={loading || selected.length === 0}>
          {loading ? "Saving…" : `Record sale (${selected.length} hd)`}
        </Button>
      </form>
    </Card>
  );
}
