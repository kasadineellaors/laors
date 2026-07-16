"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ClockStatus, TimeEntryRecord } from "@/lib/time/types";
import { clockIn, clockOut } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClockClientProps {
  orgId: string;
  status: ClockStatus;
  recentEntries: TimeEntryRecord[];
  showTeamLink?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return "In progress";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function ClockClient({
  orgId,
  status,
  recentEntries,
  showTeamLink,
}: ClockClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const result = status.isClockedIn ? await clockOut(orgId) : await clockIn(orgId);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← Dashboard
      </Link>

      {showTeamLink ? (
        <Link href="/time/team" className="block text-sm font-semibold text-brown hover:underline">
          View team time →
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{status.isClockedIn ? "On the clock" : "Clock in"}</CardTitle>
          <CardDescription>
            {status.isClockedIn && status.openEntry
              ? `Started ${formatTime(status.openEntry.clock_in_at)}`
              : "Tap to start your shift"}
          </CardDescription>
        </CardHeader>
        <Button
          size="lg"
          fullWidth
          variant={status.isClockedIn ? "secondary" : "primary"}
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? "…" : status.isClockedIn ? "Clock out" : "Clock in"}
        </Button>
        {error ? (
          <p className="mt-3 text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}
      </Card>

      {recentEntries.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Recent shifts
          </h2>
          <ul className="space-y-2">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border-neutral bg-surface-white px-3 py-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-navy">
                    {formatTime(entry.clock_in_at)}
                  </span>
                  <span className="text-text-secondary">
                    {formatDuration(entry.duration_minutes)}
                  </span>
                </div>
                {entry.clock_out_at ? (
                  <p className="text-xs text-text-secondary">
                    Out {formatTime(entry.clock_out_at)}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-brown">Open shift</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
