"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type { MedicineOption } from "@/lib/medicine/types";
import type { TreatmentRecord } from "@/lib/health/types";
import { TREATMENT_REASONS, TREATMENT_TYPES } from "@/lib/health/constants";
import { createTreatment, updateTreatment } from "@/lib/actions/health";
import { previewTreatmentMedicineUse } from "@/lib/actions/health-preview";
import {
  calculateWithdrawalEndDate,
  costLabelForUnit,
  formatMedicineUnit,
  formatQuantityWithUnit,
  formatShortDate,
} from "@/lib/health/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface TreatmentFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  medicineOptions: MedicineOption[];
  currentUserId?: string;
  treatment?: TreatmentRecord;
  onSuccess?: () => void;
}

function metaString(meta: Record<string, string | number | null> | undefined, key: string) {
  const value = meta?.[key];
  return value != null && value !== "" ? String(value) : "";
}

function metaNumber(meta: Record<string, string | number | null> | undefined, key: string) {
  const value = meta?.[key];
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function initialReasonValue(reason: string | null | undefined): string {
  if (!reason?.trim()) return "";
  const match = TREATMENT_REASONS.find(
    (r) => r.value.toLowerCase() === reason.trim().toLowerCase(),
  );
  return match?.value ?? "Other";
}

function initialSymptomNotes(
  reason: string | null | undefined,
  notes: string | null | undefined,
): string {
  const r = reason?.trim() ?? "";
  const isStructured = TREATMENT_REASONS.some(
    (item) => item.value.toLowerCase() === r.toLowerCase(),
  );
  if (!isStructured && r) {
    return [r, notes?.trim()].filter(Boolean).join("\n");
  }
  return notes?.trim() ?? "";
}

export function TreatmentForm({
  orgId,
  locationOptions,
  groupOptions,
  memberOptions,
  medicineOptions,
  currentUserId,
  treatment,
  onSuccess,
}: TreatmentFormProps) {
  const router = useRouter();
  const isEdit = Boolean(treatment);
  const hasInventory = medicineOptions.length > 0;

  const [useInventory, setUseInventory] = useState(
    Boolean(treatment?.medicine_item_id) || (hasInventory && !isEdit),
  );
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
  const [administeredTo, setAdministeredTo] = useState(
    treatment?.administered_by ?? currentUserId ?? "",
  );
  const [symptomNotes, setSymptomNotes] = useState(
    initialSymptomNotes(treatment?.reason, treatment?.notes),
  );
  const [reasonValue, setReasonValue] = useState(initialReasonValue(treatment?.reason));
  const [medicineItemId, setMedicineItemId] = useState(treatment?.medicine_item_id ?? "");
  const [quantityUsed, setQuantityUsed] = useState(
    treatment?.quantity_used != null ? String(treatment.quantity_used) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockPreview, setStockPreview] = useState<{
    onHand: number;
    unit: string;
    remainingAfter: number | null;
    message: string | null;
  } | null>(null);

  const selectedGroup = groupOptions.find((g) => g.value === groupId);
  const groupMeta = selectedGroup?.meta;
  const groupLocationId = metaString(groupMeta, "location_id");
  const groupLocationName =
    metaString(groupMeta, "location_breadcrumb") || metaString(groupMeta, "location_name");
  const groupOwnerName =
    metaString(groupMeta, "owner_name") ||
    metaString(groupMeta, "customer_name") ||
    metaString(groupMeta, "ownership_group_name");
  const groupHeadCount = metaNumber(groupMeta, "total_head");

  const selectedMedicine = medicineOptions.find((m) => m.id === medicineItemId);

  useEffect(() => {
    if (!groupId || !selectedGroup) return;
    if (groupLocationId && !locationId) setLocationId(groupLocationId);
  }, [groupId, selectedGroup, groupLocationId, locationId]);

  useEffect(() => {
    const qty = quantityUsed.trim() ? parseFloat(quantityUsed) : 0;
    if (!medicineItemId || !qty || qty <= 0) {
      setStockPreview(null);
      return;
    }
    let cancelled = false;
    previewTreatmentMedicineUse(orgId, medicineItemId, qty).then((result) => {
      if (cancelled) return;
      setStockPreview({
        onHand: result.onHand,
        unit: result.unit,
        remainingAfter: result.remainingAfter,
        message: result.message,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, medicineItemId, quantityUsed]);

  const parsedHead = headCount.trim() ? parseInt(headCount, 10) : null;
  const parsedQty = quantityUsed.trim() ? parseFloat(quantityUsed) : null;

  const dosePerHead = useMemo(() => {
    if (parsedQty == null || parsedHead == null || parsedHead <= 0) return null;
    return parsedQty / parsedHead;
  }, [parsedQty, parsedHead]);

  const withdrawalPreview = useMemo(() => {
    if (!selectedMedicine?.withdrawal_days || selectedMedicine.withdrawal_days <= 0) {
      return null;
    }
    const end = calculateWithdrawalEndDate(treatmentDate, selectedMedicine.withdrawal_days);
    return {
      days: selectedMedicine.withdrawal_days,
      endDate: end,
    };
  }, [selectedMedicine, treatmentDate]);

  const resolvedReason = useMemo(() => {
    if (!reasonValue) return undefined;
    if (reasonValue === "Other") {
      const fromNotes = symptomNotes.trim().split("\n")[0];
      return fromNotes || "Other";
    }
    return reasonValue;
  }, [reasonValue, symptomNotes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const head = headCount.trim() ? parseInt(headCount, 10) : undefined;
    if (headCount.trim() && (Number.isNaN(head!) || head! <= 0)) {
      setError("Head treated must be a positive number");
      setLoading(false);
      return;
    }

    const qty = quantityUsed.trim() ? parseFloat(quantityUsed) : undefined;
    if (useInventory && medicineItemId && (!qty || qty <= 0)) {
      setError("Enter total quantity used from inventory");
      setLoading(false);
      return;
    }
    if (qty && useInventory && !medicineItemId) {
      setError("Select a medicine from inventory");
      setLoading(false);
      return;
    }

    const name = useInventory && selectedMedicine ? selectedMedicine.name : productName.trim();
    if (!name) {
      setError("Product name is required");
      setLoading(false);
      return;
    }

    const payload = {
      productName: name,
      treatmentType: treatmentType || undefined,
      headCount: head,
      treatmentDate,
      cattleGroupId: groupId || undefined,
      locationId: locationId || undefined,
      administeredTo: administeredTo || undefined,
      notes: symptomNotes.trim() || undefined,
      reason: resolvedReason,
      medicineItemId: useInventory && medicineItemId ? medicineItemId : undefined,
      quantityUsed: useInventory ? qty : undefined,
    };

    const result = isEdit
      ? await updateTreatment(orgId, treatment!.id, {
          productName: name,
          treatmentType: treatmentType || null,
          headCount: head ?? null,
          treatmentDate,
          cattleGroupId: groupId || null,
          locationId: locationId || null,
          administeredTo: administeredTo || null,
          notes: symptomNotes.trim() || null,
          reason: resolvedReason ?? null,
          medicineItemId: useInventory ? medicineItemId || null : null,
          quantityUsed: useInventory ? (qty ?? null) : null,
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
    "flex h-12 min-h-12 w-full rounded-lg border border-border-neutral bg-surface-white px-4 text-base text-text-primary";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-navy">{isEdit ? "Edit treatment" : "Log treatment"}</CardTitle>
        <CardDescription>
          Select the cattle, record the product and dose, and confirm withdrawal or follow-up
          details.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-6 px-1 pb-2">
        {groupOptions.length > 0 ? (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Who was treated
            </h3>
            <div>
              <Label htmlFor="group">Cattle group</Label>
              <select
                id="group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className={selectClass}
              >
                <option value="">Select group (optional)</option>
                {groupOptions.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {groupId ? (
              <div className="rounded-lg border border-border-neutral bg-tan/20 px-4 py-3 text-sm">
                {groupLocationName ? (
                  <p>
                    <span className="text-text-secondary">Location: </span>
                    <span className="font-medium text-text-primary">{groupLocationName}</span>
                  </p>
                ) : null}
                {groupOwnerName ? (
                  <p className={groupLocationName ? "mt-1" : undefined}>
                    <span className="text-text-secondary">Owner: </span>
                    <span className="font-medium text-text-primary">{groupOwnerName}</span>
                  </p>
                ) : null}
                {groupHeadCount != null ? (
                  <p className="mt-1">
                    <span className="text-text-secondary">Group head count: </span>
                    <span className="font-medium text-text-primary">{groupHeadCount}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <div>
              <Label htmlFor="headCount">Head treated</Label>
              <Input
                id="headCount"
                type="number"
                min={1}
                value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                placeholder={groupHeadCount != null ? `Up to ${groupHeadCount}` : "Optional"}
              />
              <p className="mt-1 text-xs text-text-secondary">
                Enter how many head received this treatment — not assumed to be the full group.
              </p>
            </div>
          </section>
        ) : (
          <div>
            <Label htmlFor="headCount">Head treated (optional)</Label>
            <Input
              id="headCount"
              type="number"
              min={1}
              value={headCount}
              onChange={(e) => setHeadCount(e.target.value)}
            />
          </div>
        )}

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Medicine
          </h3>
          {hasInventory ? (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUseInventory(true)}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold transition-colors",
                    useInventory
                      ? "border-navy bg-navy text-white"
                      : "border-border-neutral bg-surface-white text-navy",
                  )}
                >
                  Select from inventory
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseInventory(false);
                    setMedicineItemId("");
                    setQuantityUsed("");
                    setStockPreview(null);
                  }}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold transition-colors",
                    !useInventory
                      ? "border-navy bg-navy text-white"
                      : "border-border-neutral bg-surface-white text-navy",
                  )}
                >
                  Product not in inventory
                </button>
              </div>
              {useInventory ? (
                <>
                  <div>
                    <Label htmlFor="medicine">Medicine</Label>
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
                      required
                    >
                      <option value="">Select from inventory</option>
                      {medicineOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {formatQuantityWithUnit(m.quantity_on_hand, m.unit)}
                          {m.is_out_of_stock ? " (out of stock)" : m.is_low_stock ? " (low)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedMedicine ? (
                    <div className="rounded-lg border border-border-neutral bg-tan/20 px-4 py-3 text-sm">
                      <p className="font-medium text-text-primary">{selectedMedicine.name}</p>
                      <p className="mt-1 text-text-secondary">
                        {formatQuantityWithUnit(
                          selectedMedicine.quantity_on_hand,
                          selectedMedicine.unit,
                        )}{" "}
                        on hand
                        {selectedMedicine.price_per_cc != null
                          ? ` · ${costLabelForUnit(selectedMedicine.unit)}: $${selectedMedicine.price_per_cc}`
                          : ""}
                      </p>
                      {selectedMedicine.is_out_of_stock ? (
                        <p className="mt-1 font-semibold text-status-critical">Out of stock</p>
                      ) : selectedMedicine.is_low_stock ? (
                        <p className="mt-1 font-semibold text-status-warning">Low stock</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div>
                    <Label htmlFor="qtyUsed">
                      Total quantity used
                      {selectedMedicine
                        ? ` (${formatMedicineUnit(selectedMedicine.unit)})`
                        : ""}
                    </Label>
                    <Input
                      id="qtyUsed"
                      type="number"
                      min={0}
                      step="0.01"
                      value={quantityUsed}
                      onChange={(e) => setQuantityUsed(e.target.value)}
                      required
                    />
                  </div>
                  {parsedHead != null && parsedHead > 0 && dosePerHead != null && selectedMedicine ? (
                    <p className="text-sm text-text-secondary">
                      Calculated dose per head:{" "}
                      <span className="font-medium text-text-primary">
                        {dosePerHead.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                        {formatMedicineUnit(selectedMedicine.unit)}/head
                      </span>
                    </p>
                  ) : null}
                  {stockPreview ? (
                    <div
                      className={cn(
                        "rounded-lg border px-4 py-3 text-sm",
                        stockPreview.message
                          ? "border-status-warning/40 bg-status-warning-bg"
                          : "border-border-neutral bg-surface-white",
                      )}
                      role="status"
                    >
                      <p>
                        Available before:{" "}
                        <span className="font-medium">
                          {stockPreview.onHand} {stockPreview.unit}
                        </span>
                      </p>
                      {parsedQty != null ? (
                        <p>
                          Treatment use:{" "}
                          <span className="font-medium">
                            {parsedQty} {stockPreview.unit}
                          </span>
                        </p>
                      ) : null}
                      {stockPreview.remainingAfter != null ? (
                        <p>
                          Remaining after:{" "}
                          <span className="font-medium">
                            {stockPreview.remainingAfter.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {stockPreview.unit}
                          </span>
                        </p>
                      ) : null}
                      {stockPreview.message ? (
                        <p className="mt-1 font-medium text-status-warning">{stockPreview.message}</p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div>
                  <Label htmlFor="product">Product name</Label>
                  <Input
                    id="product"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required
                    placeholder="Product used (not tracked in inventory)"
                  />
                </div>
              )}
            </>
          ) : (
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
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Treatment details
          </h3>
          <div>
            <Label htmlFor="type">Treatment type (optional)</Label>
            <select
              id="type"
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
              className={selectClass}
            >
              <option value="">Select type</option>
              {TREATMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="reason">Reason or diagnosis (optional)</Label>
            <select
              id="reason"
              value={reasonValue}
              onChange={(e) => setReasonValue(e.target.value)}
              className={selectClass}
            >
              <option value="">Select reason</option>
              {TREATMENT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="symptoms">Symptoms and notes (optional)</Label>
            <textarea
              id="symptoms"
              value={symptomNotes}
              onChange={(e) => setSymptomNotes(e.target.value)}
              rows={3}
              placeholder="Symptoms, observations, or details for unusual cases"
              className="flex min-h-[5rem] w-full rounded-lg border border-border-neutral bg-surface-white px-4 py-3 text-base"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Date and attribution
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="date">Treatment date</Label>
              <Input
                id="date"
                type="date"
                value={treatmentDate}
                onChange={(e) => setTreatmentDate(e.target.value)}
                required
              />
            </div>
            {memberOptions.length > 0 ? (
              <div>
                <Label htmlFor="administered">Administered by</Label>
                <select
                  id="administered"
                  value={administeredTo}
                  onChange={(e) => setAdministeredTo(e.target.value)}
                  className={selectClass}
                >
                  <option value={currentUserId ?? ""}>Me</option>
                  {memberOptions
                    .filter((m) => m.user_id !== currentUserId)
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
          </div>
          {locationOptions.length > 0 ? (
            <div>
              <Label htmlFor="location">Treatment location (optional)</Label>
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
        </section>

        {withdrawalPreview ? (
          <section
            className="rounded-lg border border-status-warning/40 bg-status-warning-bg px-4 py-3 text-sm"
            aria-live="polite"
          >
            <p className="font-semibold text-status-warning">Withdrawal tracking</p>
            <p className="mt-1 text-text-primary">
              Meat withdrawal: {withdrawalPreview.days} day
              {withdrawalPreview.days === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-text-primary">
              Eligible for sale:{" "}
              <span className="font-medium">{formatShortDate(withdrawalPreview.endDate)}</span>
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              Based on withdrawal days stored on this medicine product — confirm with your protocol.
            </p>
          </section>
        ) : null}

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pb-4">
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save changes" : "Log treatment"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
