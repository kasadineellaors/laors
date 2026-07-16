"use client";

import Link from "next/link";
import type { TimeEntryRecord } from "@/lib/time/types";

interface TeamTimeClientProps {
  openEntries: TimeEntryRecord[];
  recentEntries: TimeEntryRecord[];
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
  if (minutes == null) return "On clock";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function TeamTimeClient({ openEntries, recentEntries }: TeamTimeClientProps) {
  return (
    <div className="space-y-6">
      <Link href="/time" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← My clock
      </Link>

      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Team time</h1>
        <p className="text-text-secondary">Who is on the clock and recent shifts</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          On the clock now ({openEntries.length})
        </h2>
        {openEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-neutral px-4 py-6 text-center text-sm text-text-secondary">
            No one clocked in right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {openEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-navy/30 bg-navy/5 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-navy">{entry.user_name}</p>
                  <p className="text-xs text-text-secondary">Since {formatTime(entry.clock_in_at)}</p>
                </div>
                <span className="text-sm font-semibold text-brown">Working</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Recent team shifts
        </h2>
        {recentEntries.length === 0 ? (
          <p className="text-sm text-text-secondary">No time entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border-neutral bg-surface-white px-3 py-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-navy">{entry.user_name}</span>
                  <span className="text-text-secondary">{formatDuration(entry.duration_minutes)}</span>
                </div>
                <p className="text-xs text-text-secondary">
                  {formatTime(entry.clock_in_at)}
                  {entry.clock_out_at ? ` → ${formatTime(entry.clock_out_at)}` : " · open"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
