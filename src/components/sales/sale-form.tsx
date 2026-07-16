"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerOption } from "@/lib/customers/types";
import type { SelectOption } from "@/lib/locations/options";
import type { SaleRecord } from "@/lib/sales/types";
import type { SeedstockSaleType } from "@/lib/seedstock/constants";
import { SEEDSTOCK_SALE_TYPE_LABELS } from "@/lib/seedstock/constants";
import { createSale, updateSale } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PrefillAnimal {
  id: string;
  tagNumber: string;
  name?: string | null;
  animalType?: string;
}

interface SaleFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  categoryOptions: SelectOption[];
  customerOptions?: CustomerOption[];
  canDeductInventory?: boolean;
  prefillAnimal?: PrefillAnimal;
  sale?: SaleRecord;
  onSuccess?: () => void;
}

export function SaleForm({
  orgId,
  locationOptions,
  groupOptions,
  categoryOptions,
  customerOptions = [],
  canDeductInventory = false,
  prefillAnimal,
  sale,
  onSuccess,
}: SaleFormProps) {
  const router = useRouter();
  const isEdit = Boolean(sale);

  const [saleDate, setSaleDate] = useState(
    sale?.sale_date ?? new Date().toISOString().slice(0, 10),
  );
  const [customerId, setCustomerId] = useState(sale?.customer_id ?? "");
  const [buyerName, setBuyerName] = useState(sale?.buyer_name ?? "");
  const [groupId, setGroupId] = useState(sale?.cattle_group_id ?? "");
  const [locationId, setLocationId] = useState(sale?.location_id ?? "");
  const [headCount, setHeadCount] = useState(
    sale != null ? String(sale.head_count) : prefillAnimal ? "1" : "",
  );
  const [seedstockSaleType, setSeedstockSaleType] = useState<SeedstockSaleType>(
    prefillAnimal?.animalType === "bull" ? "semen" : "live_animal",
  );
  const [totalAmount, setTotalAmount] = useState(
    sale?.total_amount != null ? String(sale.total_amount) : "",
  );
  const [pricePerHead, setPricePerHead] = useState(
    sale?.price_per_head != null ? String(sale.price_per_head) : "",
  );
  const [avgWeightLbs, setAvgWeightLbs] = useState(
    sale?.avg_weight_lbs != null ? String(sale.avg_weight_lbs) : "",
  );
  const [categoryId, setCategoryId] = useState(sale?.financial_category_id ?? "");
  const [deductInventory, setDeductInventory] = useState(
    canDeductInventory && (sale?.inventory_deducted ?? true),
  );
  const [notes, setNotes] = useState(sale?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function applyCustomer(id: string) {
    setCustomerId(id);
    const customer = customerOptions.find((c) => c.id === id);
    if (customer) setBuyerName(customer.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedHead = parseInt(headCount, 10);
    if (Number.isNaN(parsedHead) || parsedHead <= 0) {
      setError("Enter a valid head count");
      setLoading(false);
      return;
    }

    const parsedTotal = totalAmount.trim() ? parseFloat(totalAmount) : undefined;
    const parsedPerHead = pricePerHead.trim() ? parseFloat(pricePerHead) : undefined;
    const parsedWeight = avgWeightLbs.trim() ? parseFloat(avgWeightLbs) : undefined;

    if (isEdit) {
      const result = await updateSale(orgId, sale!.id, {
        saleDate,
        buyerName: buyerName || null,
        customerId: customerId || null,
        locationId: locationId || null,
        totalAmount: parsedTotal ?? null,
        pricePerHead: parsedPerHead ?? null,
        avgWeightLbs: avgWeightLbs.trim() ? parsedWeight ?? null : null,
        financialCategoryId: categoryId || null,
        notes: notes || null,
      });
      setLoading(false);
      if (result.error) setError(result.error);
      else if (onSuccess) onSuccess();
      else router.refresh();
      return;
    }

    const result = await createSale(orgId, {
      saleDate,
      buyerName: buyerName || undefined,
      customerId: customerId || undefined,
      cattleGroupId: groupId || undefined,
      locationId: locationId || undefined,
      headCount: parsedHead,
      totalAmount: parsedTotal,
      pricePerHead: parsedPerHead,
      avgWeightLbs: parsedWeight,
      financialCategoryId: categoryId || undefined,
      deductFromInventory:
        canDeductInventory && deductInventory && Boolean(groupId) && !prefillAnimal,
      individualAnimalId: prefillAnimal?.id,
      seedstockSaleType: prefillAnimal ? seedstockSaleType : undefined,
      notes: notes || undefined,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.saleId) router.push(`/sales/${result.saleId}`);
    else router.push("/sales");
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit sale" : "Record sale"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Head count cannot be changed — archive and re-enter if needed."
            : prefillAnimal
              ? `Recording a sale for ${prefillAnimal.tagNumber}${prefillAnimal.name ? ` (${prefillAnimal.name})` : ""}.`
              : "Log cattle sold and optionally deduct from a group."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {prefillAnimal && !isEdit ? (
          <div>
            <Label htmlFor="seedstockSaleType">Sale type</Label>
            <select
              id="seedstockSaleType"
              value={seedstockSaleType}
              onChange={(e) => setSeedstockSaleType(e.target.value as SeedstockSaleType)}
              className={selectClass}
            >
              {(Object.keys(SEEDSTOCK_SALE_TYPE_LABELS) as SeedstockSaleType[]).map((key) => (
                <option key={key} value={key}>
                  {SEEDSTOCK_SALE_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Sale date</Label>
            <Input
              id="date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
            />
          </div>
          {!isEdit ? (
            <div>
              <Label htmlFor="headCount">Head sold</Label>
              <Input
                id="headCount"
                type="number"
                min={1}
                value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                required
              />
            </div>
          ) : (
            <div>
              <Label>Head sold</Label>
              <p className="flex h-12 items-center text-xl font-bold text-olive">
                {sale!.head_count}
              </p>
            </div>
          )}
        </div>
        {customerOptions.length > 0 ? (
          <div>
            <Label htmlFor="customerPick">Saved customer (optional)</Label>
            <select
              id="customerPick"
              value={customerId}
              onChange={(e) => applyCustomer(e.target.value)}
              className={selectClass}
            >
              <option value="">Type buyer name below</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="buyer">Buyer (optional)</Label>
          <Input
            id="buyer"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Buyer or market name"
          />
        </div>
        {!isEdit && !prefillAnimal && groupOptions.length > 0 ? (
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
        {!isEdit && groupId && canDeductInventory ? (
          <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={deductInventory}
              onChange={(e) => setDeductInventory(e.target.checked)}
              className="h-5 w-5"
            />
            <span>Deduct {headCount || "?"} head from group inventory</span>
          </label>
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
              <option value="">None</option>
              {locationOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="total">Total ($)</Label>
            <Input
              id="total"
              type="number"
              min={0}
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="perHead">Per head ($)</Label>
            <Input
              id="perHead"
              type="number"
              min={0}
              step="0.01"
              value={pricePerHead}
              onChange={(e) => setPricePerHead(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="avgWeight">Avg out weight (lb/head)</Label>
          <Input
            id="avgWeight"
            type="number"
            min={0}
            step="1"
            value={avgWeightLbs}
            onChange={(e) => setAvgWeightLbs(e.target.value)}
            placeholder="Optional — for closeout gain"
          />
        </div>
        {categoryOptions.length > 0 ? (
          <div>
            <Label htmlFor="category">Income category</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select category</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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
          {loading ? "Saving…" : isEdit ? "Save changes" : "Record sale"}
        </Button>
      </form>
    </Card>
  );
}
