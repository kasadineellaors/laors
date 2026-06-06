"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type { MedicineOption } from "@/lib/medicine/types";
import type { TreatmentRecord } from "@/lib/health/types";
import { createTreatment, updateTreatment } from "@/lib/actions/health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TreatmentFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  medicineOptions: MedicineOption[];
  treatment?: TreatmentRecord;
  onSuccess?: () => void;
}

export function TreatmentForm({
  orgId,
  locationOptions,
  groupOptions,
  memberOptions,
  medicineOptions,
  treatment,
  onSuccess,
}: TreatmentFormProps) {
  const router = useRouter();
  const isEdit = Boolean(treatment);

  const [productName, setProductName] = useState(treatment?.product_name ?? "");
  const [treatmentType, setTreatmentType] = useState(treatment?.treatment_type ?? "");
  const [headCount, setHeadCount] = useState(
    treatment?.head_count != null ? String(treatment.head_count) : "",
  );
  const [treatmentDate, setTreatmentDate] = useState(
    treatment?.treatment_date ?? new Date().toISOString().slice(0, 10),
  );
  const [groupId, setGroupId] = useState(treatment?.cattle_group_id ?? "");
  const [locationId, setLocationId] = useState(treatment?.location_id ?? "");
  const [administeredTo, setAdministeredTo] = useState(treatment?.administered_by ?? "");
  const [notes, setNotes] = useState(treatment?.notes ?? "");
  const [medicineItemId, setMedicineItemId] = useState(treatment?.medicine_item_id ?? "");
  const [quantityUsed, setQuantityUsed] = useState(
    treatment?.quantity_used != null ? String(treatment.quantity_used) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedHead = headCount.trim() ? parseInt(headCount, 10) : undefined;
    if (headCount.trim() && (Number.isNaN(parsedHead) || parsedHead! <= 0)) {
      setError("Head count must be a positive number");
      setLoading(false);
      return;
    }

    const parsedQty = quantityUsed.trim() ? parseFloat(quantityUsed) : undefined;
    if (medicineItemId && (!parsedQty || parsedQty <= 0)) {
      setError("Enter quantity used from inventory");
      setLoading(false);
      return;
    }
    if (parsedQty && !medicineItemId) {
      setError("Select a medicine from inventory");
      setLoading(false);
      return;
    }

    const payload = {
      productName,
      treatmentType: treatmentType || undefined,
      headCount: parsedHead,
      treatmentDate,
      cattleGroupId: groupId || undefined,
      locationId: locationId || undefined,
      administeredTo: administeredTo || undefined,
      notes: notes || undefined,
      medicineItemId: medicineItemId || undefined,
      quantityUsed: parsedQty,
    };

    const result = isEdit
      ? await updateTreatment(orgId, treatment!.id, {
          productName,
          treatmentType: treatmentType || null,
          headCount: parsedHead ?? null,
          treatmentDate,
          cattleGroupId: groupId || null,
          locationId: locationId || null,
          administeredTo: administeredTo || null,
          notes: notes || null,
          medicineItemId: medicineItemId || null,
          quantityUsed: parsedQty ?? null,
        })
      : await createTreatment(orgId, payload);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.treatmentId) router.push(`/health/treatments/${result.treatmentId}`);
    else router.push("/health/treatments");
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit treatment" : "Log treatment"}</CardTitle>
        <CardDescription>Vaccine, dewormer, antibiotic — what was given?</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="product">Product</Label>
          <Input
            id="product"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            placeholder="Long Range, Cydectin, etc."
          />
        </div>
        {medicineOptions.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="medicine">From inventory (optional)</Label>
              <select
                id="medicine"
                value={medicineItemId}
                onChange={(e) => {
                  const id = e.target.value;
                  setMedicineItemId(id);
                  const item = medicineOptions.find((m) => m.id === id);
                  if (item) setProductName(item.name);
                }}
                className={selectClass}
              >
                <option value="">Manual entry only</option>
                {medicineOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.quantity_on_hand} {m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="qtyUsed">Qty used</Label>
              <Input
                id="qtyUsed"
                type="number"
                min={0}
                step="0.01"
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(e.target.value)}
                placeholder={medicineItemId ? "Required" : "Optional"}
              />
            </div>
          </div>
        ) : null}
        <div>
          <Label htmlFor="type">Type (optional)</Label>
          <Input
            id="type"
            value={treatmentType}
            onChange={(e) => setTreatmentType(e.target.value)}
            placeholder="Vaccine, deworm, antibiotic"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="headCount">Head count</Label>
            <Input
              id="headCount"
              type="number"
              min={1}
              value={headCount}
              onChange={(e) => setHeadCount(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={treatmentDate}
              onChange={(e) => setTreatmentDate(e.target.value)}
              required
            />
          </div>
        </div>
        {groupOptions.length > 0 ? (
          <div>
            <Label htmlFor="group">Cattle group (optional)</Label>
            <select
              id="group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {groupOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {locationOptions.length > 0 ? (
          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={selectClass}
            >
              <option value="">Ranch-wide</option>
              {locationOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {memberOptions.length > 0 ? (
          <div>
            <Label htmlFor="administered">Administered by</Label>
            <select
              id="administered"
              value={administeredTo}
              onChange={(e) => setAdministeredTo(e.target.value)}
              className={selectClass}
            >
              <option value="">Me</option>
              {memberOptions.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name}
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
          {loading ? "Saving…" : isEdit ? "Save changes" : "Log treatment"}
        </Button>
      </form>
    </Card>
  );
}
