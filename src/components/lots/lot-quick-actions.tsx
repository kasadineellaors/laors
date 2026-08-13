"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProcessingEvent, recordMortality } from "@/lib/actions/lots";
import { PROCESSING_TYPE_LABELS, type ProcessingType } from "@/lib/lots/types";
import { QuickAddSection } from "@/components/dashboard/quick-add-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LotQuickActionsProps {
  orgId: string;
  groupId: string;
}

export function LotQuickActions({ orgId, groupId }: LotQuickActionsProps) {
  const router = useRouter();
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [processedAt, setProcessedAt] = useState(new Date().toISOString().slice(0, 10));
  const [headProcessed, setHeadProcessed] = useState("");
  const [processingType, setProcessingType] = useState<ProcessingType>("arrival");
  const [chuteCharge, setChuteCharge] = useState("");
  const [laborCharge, setLaborCharge] = useState("");
  const [medicineCost, setMedicineCost] = useState("");

  const [diedAt, setDiedAt] = useState(new Date().toISOString().slice(0, 10));
  const [deathHead, setDeathHead] = useState("1");
  const [deathWeight, setDeathWeight] = useState("");
  const [cause, setCause] = useState("");

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  function closePanel() {
    setActivePanelId(null);
    setError(null);
  }

  async function submitProcessing(e: React.FormEvent) {
    e.preventDefault();
    const heads = parseInt(headProcessed, 10);
    if (Number.isNaN(heads) || heads <= 0) {
      setError("Enter head processed");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createProcessingEvent(orgId, groupId, {
      processedAt,
      headCount: heads,
      processingType,
      chuteCharge: chuteCharge.trim() ? parseFloat(chuteCharge) : 0,
      laborCharge: laborCharge.trim() ? parseFloat(laborCharge) : 0,
      medicineCost: medicineCost.trim() ? parseFloat(medicineCost) : 0,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      closePanel();
      router.refresh();
    }
  }

  async function submitDeath(e: React.FormEvent) {
    e.preventDefault();
    const heads = parseInt(deathHead, 10);
    if (Number.isNaN(heads) || heads <= 0) {
      setError("Enter head count");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await recordMortality(orgId, groupId, {
      diedAt,
      headCount: heads,
      weightLbs: deathWeight.trim() ? parseFloat(deathWeight) : undefined,
      cause: cause || undefined,
      deductInventory: true,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      closePanel();
      router.refresh();
    }
  }

  const processingPanel = (
    <form onSubmit={submitProcessing} className="space-y-3 rounded-lg border border-border-neutral p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="processedAt">Date</Label>
          <Input
            id="processedAt"
            type="date"
            value={processedAt}
            onChange={(e) => setProcessedAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="headProcessed">Head processed</Label>
          <Input
            id="headProcessed"
            type="number"
            min={1}
            value={headProcessed}
            onChange={(e) => setHeadProcessed(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="ptype">Type</Label>
        <select
          id="ptype"
          value={processingType}
          onChange={(e) => setProcessingType(e.target.value as ProcessingType)}
          className={selectClass}
        >
          {Object.entries(PROCESSING_TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="chute">Chute $</Label>
          <Input id="chute" type="number" min={0} step="0.01" value={chuteCharge} onChange={(e) => setChuteCharge(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="labor">Labor $</Label>
          <Input id="labor" type="number" min={0} step="0.01" value={laborCharge} onChange={(e) => setLaborCharge(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="medCost">Medicine $</Label>
          <Input id="medCost" type="number" min={0} step="0.01" value={medicineCost} onChange={(e) => setMedicineCost(e.target.value)} />
        </div>
      </div>
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Saving…" : "Save processing"}
      </Button>
    </form>
  );

  const deathPanel = (
    <form onSubmit={submitDeath} className="space-y-3 rounded-lg border border-border-neutral p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="diedAt">Date</Label>
          <Input id="diedAt" type="date" value={diedAt} onChange={(e) => setDiedAt(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="deathHead">Head</Label>
          <Input id="deathHead" type="number" min={1} value={deathHead} onChange={(e) => setDeathHead(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="deathWeight">Weight (lb)</Label>
          <Input
            id="deathWeight"
            type="number"
            min={0}
            step="0.1"
            value={deathWeight}
            onChange={(e) => setDeathWeight(e.target.value)}
            placeholder="Total or avg"
          />
        </div>
        <div>
          <Label htmlFor="cause">Cause</Label>
          <Input id="cause" value={cause} onChange={(e) => setCause(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Saving…" : "Record death & deduct head"}
      </Button>
    </form>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing & mortality</CardTitle>
        <CardDescription>Log group processing or death loss — updates lot costs and head count.</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-4 pb-4">
        <QuickAddSection
          title=""
          items={[
            {
              type: "panel",
              id: "processing",
              addLabel: "Add Processing",
              panel: processingPanel,
            },
            {
              type: "panel",
              id: "death",
              addLabel: "Add Death Loss",
              panel: deathPanel,
            },
            {
              type: "link",
              id: "remove",
              addLabel: "Remove Cattle",
              href: `/cattle/move?from=${groupId}&mode=remove`,
            },
          ]}
          activePanelId={activePanelId}
          onActivePanelChange={(id) => {
            setActivePanelId(id);
            if (!id) setError(null);
          }}
        />

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
