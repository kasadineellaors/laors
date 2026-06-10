"use client";

import type { ExportRecordType } from "@/lib/export/types";
import { Button } from "@/components/ui/button";

interface ExportButtonsProps {
  orgId: string;
  recordType: ExportRecordType;
  from?: string;
  to?: string;
  size?: "sm" | "md" | "lg";
}

function buildUrl(
  orgId: string,
  recordType: ExportRecordType,
  format: "csv" | "pdf",
  from?: string,
  to?: string,
) {
  const params = new URLSearchParams({ orgId, type: recordType, format });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/export?${params.toString()}`;
}

export function ExportButtons({ orgId, recordType, from, to, size = "lg" }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <a href={buildUrl(orgId, recordType, "csv", from, to)} download>
        <Button type="button" variant="outline" size={size}>
          CSV
        </Button>
      </a>
      <a href={buildUrl(orgId, recordType, "pdf", from, to)} download>
        <Button type="button" variant="outline" size={size}>
          PDF
        </Button>
      </a>
    </div>
  );
}
