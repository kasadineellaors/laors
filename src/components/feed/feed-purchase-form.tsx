"use client";

import { useState } from "react";
import { recordFeedPurchase } from "@/lib/actions/feed-inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestionInput } from "@/components/ui/suggestion-input";

interface FeedPurchaseFormProps {
  orgId: string;
  itemId: string;
  unit: string;
  supplierSuggestions: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeedPurchaseForm({
  orgId,
  itemId,
  unit,
  supplierSuggestions,
  onSuccess,
  onCancel,
}: FeedPurchaseFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [purchasedAt, setPurchasedAt] = useState(today);
  const [vendorName, setVendorName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = parseFloat(quantity);
  const cost = parseFloat(totalCost);
  const unitCost =
    !Number.isNaN(qty) && qty > 0 && !Number.isNaN(cost) && cost >= 0 ? cost / qty : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Enter quantity received");
      return;
    }
    if (Number.isNaN(cost) || cost < 0) {
      setError("Enter total cost");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await recordFeedPurchase(orgId, itemId, {
      purchasedAt,
      vendorName: vendorName || undefined,
      quantity: qty,
      totalCost: cost,
      invoiceRef: invoiceRef || undefined,
      notes: notes || undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border-neutral p-4">
      <p className="text-sm font-semibold text-navy">Record commodity purchase</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="purchaseDate">Date</Label>
          <Input
            id="purchaseDate"
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="vendor">Supplier</Label>
          <SuggestionInput
            id="vendor"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            suggestions={supplierSuggestions}
            placeholder="Start typing — past suppliers appear"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="qty">Quantity ({unit})</Label>
          <Input
            id="qty"
            type="number"
            min={0}
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="totalCost">Total cost ($)</Label>
          <Input
            id="totalCost"
            type="number"
            min={0}
            step="0.01"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            required
          />
        </div>
      </div>
      {unitCost != null ? (
        <p className="text-sm text-text-secondary">
          Cost per {unit}: <span className="font-bold">${unitCost.toFixed(4)}</span>
          {" · "}updates weighted-average inventory cost
        </p>
      ) : null}
      <div>
        <Label htmlFor="invoice">Invoice / ticket #</Label>
        <Input id="invoice" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="purchaseNotes">Notes</Label>
        <Input id="purchaseNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Saving…" : "Record purchase"}
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
