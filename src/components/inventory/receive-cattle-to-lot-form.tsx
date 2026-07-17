"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { receiveCattleToLot } from "@/lib/actions/inventory";
import { computeAvgWeightIn, perHeadAvg, shrinkPct } from "@/lib/lots/purchase-weights";
import type { RanchFieldSuggestions } from "@/lib/ranch/field-suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestionInput } from "@/components/ui/suggestion-input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReceiveCattleToLotFormProps {
  orgId: string;
  groupId: string;
  lotLabel: string;
  fieldSuggestions: Pick<RanchFieldSuggestions, "sellers" | "sources">;
}

export function ReceiveCattleToLotForm({
  orgId,
  groupId,
  lotLabel,
  fieldSuggestions,
}: ReceiveCattleToLotFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [headCount, setHeadCount] = useState("");
  const [payWeight, setPayWeight] = useState("");
  const [receivedWeight, setReceivedWeight] = useState("");
  const [pricePerLb, setPricePerLb] = useState("");
  const [landedCost, setLandedCost] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const head = parseInt(headCount, 10);
  const hasHead = !Number.isNaN(head) && head > 0;
  const payNum = payWeight.trim() ? parseFloat(payWeight) : null;
  const receivedNum = receivedWeight.trim() ? parseFloat(receivedWeight) : null;
  const payToReceived = shrinkPct(payNum, receivedNum);
  const avgIn = hasHead
    ? computeAvgWeightIn(head, {
        payWeightLbs: payNum,
        receivedWeightLbs: receivedNum,
      })
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const count = parseInt(headCount, 10);
    if (Number.isNaN(count) || count <= 0) {
      setError("Enter a head count greater than zero");
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
    const result = await receiveCattleToLot(orgId, groupId, {
      headCount: count,
      purchaseDate,
      payWeightLbs: pay,
      receivedWeightLbs: received,
      purchasePricePerLb: price,
      landedCost: landed,
      sellerName: sellerName || undefined,
      sourceName: sourceName || undefined,
      notes: notes || undefined,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setHeadCount("");
    setPayWeight("");
    setReceivedWeight("");
    setPricePerLb("");
    setLandedCost("");
    setSellerName("");
    setSourceName("");
    setNotes("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive cattle</CardTitle>
        <CardDescription>
          Add head to <span className="font-semibold text-navy">{lotLabel}</span> without leaving
          this lot.
        </CardDescription>
      </CardHeader>
      <div className="px-4 pb-4">
        {!open ? (
          <Button type="button" fullWidth size="lg" onClick={() => setOpen(true)}>
            Receive to this lot
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="receiveDate">Purchase / arrival date</Label>
                <Input
                  id="receiveDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="receiveHead">Head count</Label>
                <Input
                  id="receiveHead"
                  type="number"
                  min="1"
                  value={headCount}
                  onChange={(e) => setHeadCount(e.target.value)}
                  required
                  className="text-center text-xl font-bold tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="receiveSeller">Seller</Label>
                <SuggestionInput
                  id="receiveSeller"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  suggestions={fieldSuggestions.sellers}
                  placeholder="Start typing — past sellers appear"
                />
              </div>
              <div>
                <Label htmlFor="receiveSource">Source / market</Label>
                <SuggestionInput
                  id="receiveSource"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  suggestions={fieldSuggestions.sources}
                  placeholder="Sale barn, market, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <WeightField
                id="receivePayWeight"
                label="Pay weight (lb)"
                value={payWeight}
                onChange={setPayWeight}
                perHead={hasHead ? perHeadAvg(payNum, head) : null}
              />
              <WeightField
                id="receiveReceivedWeight"
                label="Received weight (lb)"
                value={receivedWeight}
                onChange={setReceivedWeight}
                perHead={hasHead ? perHeadAvg(receivedNum, head) : null}
              />
            </div>
            {avgIn != null || payToReceived != null ? (
              <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                {avgIn != null ? (
                  <span className="rounded-full bg-cream/60 px-2.5 py-1 font-medium">
                    Avg weight in: {Math.round(avgIn)} lb / hd
                  </span>
                ) : null}
                {payToReceived != null ? (
                  <span className="rounded-full bg-cream/60 px-2.5 py-1 font-medium">
                    Pay → received: {payToReceived.toFixed(1)}%
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="receivePrice">Price per lb ($)</Label>
                <Input
                  id="receivePrice"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={pricePerLb}
                  onChange={(e) => setPricePerLb(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="receiveLanded">Landed cost ($)</Label>
                <Input
                  id="receiveLanded"
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
              <Label htmlFor="receiveNotes">Notes</Label>
              <Input id="receiveNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error ? (
              <p className="text-sm text-status-critical" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Receive cattle"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

function WeightField({
  id,
  label,
  value,
  onChange,
  perHead,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  perHead: number | null;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {perHead != null ? (
        <p className="mt-1 text-xs text-text-secondary">{Math.round(perHead)} lb / hd</p>
      ) : null}
    </div>
  );
}
