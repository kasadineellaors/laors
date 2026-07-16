"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectOption } from "@/lib/locations/options";
import type { RainfallRecord } from "@/lib/weather/types";
import { archiveRainfallRecord } from "@/lib/actions/weather";
import { RainfallForm } from "@/components/weather/rainfall-form";
import { Button } from "@/components/ui/button";

interface RainfallDetailClientProps {
  orgId: string;
  record: RainfallRecord;
  locationOptions: SelectOption[];
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RainfallDetailClient({
  orgId,
  record,
  locationOptions,
}: RainfallDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!window.confirm("Archive this rainfall record?")) return;
    setLoading(true);
    const result = await archiveRainfallRecord(orgId, record.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/weather/rainfall");
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href="/weather/rainfall" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Rainfall
        </Link>
        <RainfallForm
          orgId={orgId}
          record={record}
          locationOptions={locationOptions}
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/weather/rainfall" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← Rainfall
      </Link>

      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-5">
        <p className="text-4xl font-bold text-brown">{record.amount_inches}&quot;</p>
        <p className="mt-2 text-sm text-text-secondary">{formatDate(record.recorded_date)}</p>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-text-secondary">Location</dt>
            <dd className="font-medium text-navy">
              {record.location_label ?? "Ranch-wide"}
            </dd>
          </div>
          {record.recorded_by_name ? (
            <div>
              <dt className="text-text-secondary">Recorded by</dt>
              <dd className="font-medium text-navy">{record.recorded_by_name}</dd>
            </div>
          ) : null}
          {record.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="font-medium text-navy">{record.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={() => setEditing(true)} disabled={loading}>
          Edit
        </Button>
        <Button variant="outline" size="lg" onClick={handleArchive} disabled={loading}>
          Archive
        </Button>
      </div>
    </div>
  );
}
