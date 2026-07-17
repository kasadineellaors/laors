"use client";

import { useEffect, useState } from "react";
import type { LotPurchaseRecord } from "@/lib/lots/purchase-types";
import { updateLotPurchase } from "@/lib/actions/lot-purchases";
import type { RanchFieldSuggestions } from "@/lib/ranch/field-suggestions";
import { perHeadAvg } from "@/lib/lots/purchase-weights";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestionInput } from "@/components/ui/suggestion-input";

interface LotPurchaseFormProps {
  orgId: string;
  groupId: string;
  purchase: LotPurchaseRecord;
  fieldSuggestions: Pick<RanchFieldSuggestions, "sellers" | "sources">;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LotPurchaseForm({
  orgId,
  groupId,
  purchase,
  fieldSuggestions,
  onSuccess,
  onCancel,
}: LotPurchaseFormProps) {
  const [purchasedAt, setPurchasedAt] = useState(purchase.purchased_at);
  const [arrivalDate, setArrivalDate] = useState(purchase.arrival_date ?? purchase.purchased_at);
  const [sellerName, setSellerName] = useState(purchase.seller_name ?? "");
  const [sourceName, setSourceName] = useState(purchase.source_name ?? "");
  const [invoiceRef, setInvoiceRef] = useState(purchase.invoice_ref ?? "");
  const [headCount, setHeadCount] = useState(String(purchase.head_count));
  const [payWeight, setPayWeight] = useState(
    purchase.pay_weight_lbs != null ? String(purchase.pay_weight_lbs) : "",
  );
  const [receivedWeight, setReceivedWeight] = useState(
    purchase.received_weight_lbs != null ? String(purchase.received_weight_lbs) : "",
  );
  const [pricePerLb, setPricePerLb] = useState(
    purchase.purchase_price_per_lb != null ? String(purchase.purchase_price_per_lb) : "",
  );
  const [landedCost, setLandedCost] = useState(
    purchase.landed_cost != null ? String(purchase.landed_cost) : "",
  );
  const [notes, setNotes] = useState(purchase.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPurchasedAt(purchase.purchased_at);
    setArrivalDate(purchase.arrival_date ?? purchase.purchased_at);
    setSellerName(purchase.seller_name ?? "");
    setSourceName(purchase.source_name ?? "");
    setInvoiceRef(purchase.invoice_ref ?? "");
    setHeadCount(String(purchase.head_count));
    setPayWeight(purchase.pay_weight_lbs != null ? String(purchase.pay_weight_lbs) : "");
    setReceivedWeight(
      purchase.received_weight_lbs != null ? String(purchase.received_weight_lbs) : "",
    );
    setPricePerLb(
      purchase.purchase_price_per_lb != null ? String(purchase.purchase_price_per_lb) : "",
    );
    setLandedCost(purchase.landed_cost != null ? String(purchase.landed_cost) : "");
    setNotes(purchase.notes ?? "");
    setError(null);
  }, [purchase]);

  const head = parseInt(headCount, 10);
  const payNum = payWeight.trim() ? parseFloat(payWeight) : null;
  const receivedNum = receivedWeight.trim() ? parseFloat(receivedWeight) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const count = parseInt(headCount, 10);
    if (Number.isNaN(count) || count <= 0) {
      setError("Enter a valid head count");
      return;
    }

    const pay = payWeight.trim() ? parseFloat(payWeight) : undefined;
    const received = receivedWeight.trim() ? parseFloat(receivedWeight) : undefined;
    const price = pricePerLb.trim() ? parseFloat(pricePerLb) : undefined;
    const landed = landedCost.trim()
      ? parseFloat(landedCost)
      : pay && price
        ? pay * price
        : undefined;

    setLoading(true);
    setError(null);
    const result = await updateLotPurchase(orgId, groupId, purchase.id, {
      purchasedAt,
      arrivalDate,
      sellerName: sellerName || undefined,
      sourceName: sourceName || undefined,
      invoiceRef: invoiceRef || undefined,
      headCount: count,
      payWeightLbs: pay,
      receivedWeightLbs: received,
      purchasePricePerLb: price,
      landedCost: landed,
      notes: notes || undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border-neutral p-4">
      <p className="text-sm font-semibold text-navy">Edit purchase receipt</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="editPurchaseDate">Purchase date</Label>
          <Input
            id="editPurchaseDate"
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="editArrivalDate">Arrival date</Label>
          <Input
            id="editArrivalDate"
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="editSeller">Seller</Label>
          <SuggestionInput
            id="editSeller"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            suggestions={fieldSuggestions.sellers}
          />
        </div>
        <div>
          <Label htmlFor="editSource">Source / market</Label>
          <SuggestionInput
            id="editSource"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            suggestions={fieldSuggestions.sources}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="editInvoice">Invoice / ticket #</Label>
        <Input
          id="editInvoice"
          value={invoiceRef}
          onChange={(e) => setInvoiceRef(e.target.value)}
          placeholder="Purchase invoice or sale ticket"
        />
      </div>
      <div>
        <Label htmlFor="editHead">Head count</Label>
        <Input
          id="editHead"
          type="number"
          min="1"
          value={headCount}
          onChange={(e) => setHeadCount(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="editPayWeight">Pay weight (lb)</Label>
          <Input
            id="editPayWeight"
            type="number"
            min="0"
            step="any"
            value={payWeight}
            onChange={(e) => setPayWeight(e.target.value)}
          />
          {head > 0 && payNum != null ? (
            <p className="mt-1 text-xs text-text-secondary">
              {Math.round(perHeadAvg(payNum, head) ?? 0)} lb / hd
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="editReceivedWeight">Received weight (lb)</Label>
          <Input
            id="editReceivedWeight"
            type="number"
            min="0"
            step="any"
            value={receivedWeight}
            onChange={(e) => setReceivedWeight(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="editPrice">Price per lb ($)</Label>
          <Input
            id="editPrice"
            type="number"
            min="0"
            step="0.0001"
            value={pricePerLb}
            onChange={(e) => setPricePerLb(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="editLanded">Landed cost ($)</Label>
          <Input
            id="editLanded"
            type="number"
            min="0"
            step="0.01"
            value={landedCost}
            onChange={(e) => setLandedCost(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="editNotes">Notes</Label>
        <Input id="editNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
