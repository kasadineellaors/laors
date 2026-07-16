"use client";

import { useState } from "react";
import type { ExportRecordType } from "@/lib/export/types";
import { EXPORT_TYPE_LABELS } from "@/lib/export/types";
import { ExportButtons } from "@/components/export/export-buttons";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const EXPORT_TYPES = Object.keys(EXPORT_TYPE_LABELS) as ExportRecordType[];

interface ExportHubProps {
  orgId: string;
  showCowCalf: boolean;
  showSeedstock?: boolean;
}

export function ExportHub({ orgId, showCowCalf, showSeedstock = false }: ExportHubProps) {
  const [recordType, setRecordType] = useState<ExportRecordType>("treatments");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const types = EXPORT_TYPES.filter((t) => {
    if (t === "calving" || t === "breeding" || t === "feedings_cow_calf") {
      return showCowCalf;
    }
    if (
      t === "maternal_fertility" ||
      t === "maternal_calf_crop" ||
      t === "maternal_calving_ease" ||
      t === "weaning"
    ) {
      return showSeedstock;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download records</CardTitle>
        <CardDescription>
          Export as CSV (spreadsheet) or PDF. Leave dates blank to include all records.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-4 pb-4">
        <div className="space-y-2">
          <Label htmlFor="exportType">Record type</Label>
          <select
            id="exportType"
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as ExportRecordType)}
            className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-sm"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {EXPORT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="from">From (optional)</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To (optional)</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <ExportButtons
          orgId={orgId}
          recordType={recordType}
          from={from || undefined}
          to={to || undefined}
        />
      </div>
    </Card>
  );
}
