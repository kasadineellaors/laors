"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import { createCattleGroup } from "@/lib/actions/inventory";
import { ENTERPRISE_LABELS, type EnterpriseType } from "@/lib/lots/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CreateGroupFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  ownershipOptions: SelectOption[];
  customerOptions: SelectOption[];
}

export function CreateGroupForm({
  orgId,
  locationOptions,
  ownershipOptions,
  customerOptions,
}: CreateGroupFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [lotNumber, setLotNumber] = useState("");
  const [name, setName] = useState("");
  const [enterpriseType, setEnterpriseType] = useState<EnterpriseType>("stocker");
  const [locationId, setLocationId] = useState(locationOptions[0]?.value ?? "");
  const [ownershipGroupId, setOwnershipGroupId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [arrivalDate, setArrivalDate] = useState(today);
  const [sellerName, setSellerName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [payWeight, setPayWeight] = useState("");
  const [pricePerLb, setPricePerLb] = useState("");
  const [landedCost, setLandedCost] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const count = parseInt(headCount, 10);
    if (Number.isNaN(count) || count <= 0) {
      setError("Enter a head count greater than zero");
      setLoading(false);
      return;
    }

    const pay = payWeight.trim() ? parseFloat(payWeight) : undefined;
    const price = pricePerLb.trim() ? parseFloat(pricePerLb) : undefined;
    const landed = landedCost.trim()
      ? parseFloat(landedCost)
      : pay && price
        ? pay * price
        : undefined;

    const result = await createCattleGroup(orgId, {
      name: name.trim() || lotNumber.trim() || `Lot ${purchaseDate}`,
      locationId,
      headCount: count,
      notes: notes || undefined,
      ownershipGroupId: ownershipGroupId || undefined,
      customerId: customerId || undefined,
      lotNumber: lotNumber || undefined,
      enterpriseType,
      purchaseDate,
      arrivalDate,
      payWeightLbs: pay,
      purchasePricePerLb: price,
      landedCost: landed,
      sellerName: sellerName || undefined,
      sourceName: sourceName || undefined,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(result.groupId ? `/cattle/groups/${result.groupId}` : "/cattle");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive cattle / new lot</CardTitle>
        <CardDescription>
          Enter the purchase once — head, pen, owner, and costs flow through feed,
          health, sales, and billing automatically.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lotNumber">Lot ID</Label>
            <Input
              id="lotNumber"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="2025 RE-JRS"
            />
          </div>
          <div>
            <Label htmlFor="enterprise">Enterprise</Label>
            <select
              id="enterprise"
              value={enterpriseType}
              onChange={(e) => setEnterpriseType(e.target.value as EnterpriseType)}
              className={selectClass}
            >
              {Object.entries(ENTERPRISE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="groupName">Lot name / description</Label>
          <Input
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="JRS stockers — south trap"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="seller">Seller</Label>
            <Input id="seller" value={sellerName} onChange={(e) => setSellerName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="source">Source / market</Label>
            <Input id="source" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="purchaseDate">Purchase date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="arrivalDate">Arrival date</Label>
            <Input
              id="arrivalDate"
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="locationId">Pen / pasture</Label>
          <select
            id="locationId"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
            className={selectClass}
          >
            {locationOptions.length === 0 ? (
              <option value="">Add locations in Ranch Setup first</option>
            ) : (
              locationOptions.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))
            )}
          </select>
        </div>
        {ownershipOptions.length > 0 ? (
          <div>
            <Label htmlFor="ownershipGroup">Owner</Label>
            <select
              id="ownershipGroup"
              value={ownershipGroupId}
              onChange={(e) => setOwnershipGroupId(e.target.value)}
              className={selectClass}
            >
              <option value="">Ranch-owned / none</option>
              {ownershipOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {customerOptions.length > 0 ? (
          <div>
            <Label htmlFor="customer">Billing customer</Label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {customerOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="headCount">Head count</Label>
            <Input
              id="headCount"
              type="number"
              min="1"
              value={headCount}
              onChange={(e) => setHeadCount(e.target.value)}
              required
              className="text-center text-xl font-bold tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="payWeight">Pay weight (lb)</Label>
            <Input
              id="payWeight"
              type="number"
              min="0"
              step="0.01"
              value={payWeight}
              onChange={(e) => setPayWeight(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pricePerLb">Price per lb ($)</Label>
            <Input
              id="pricePerLb"
              type="number"
              min="0"
              step="0.0001"
              value={pricePerLb}
              onChange={(e) => setPricePerLb(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="landedCost">Landed cost ($)</Label>
            <Input
              id="landedCost"
              type="number"
              min="0"
              step="0.01"
              value={landedCost}
              onChange={(e) => setLandedCost(e.target.value)}
              placeholder="Auto from weight × price"
            />
          </div>
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
        <Button type="submit" fullWidth size="xl" disabled={loading || !locationId}>
          {loading ? "Saving…" : "Create lot"}
        </Button>
      </form>
    </Card>
  );
}
