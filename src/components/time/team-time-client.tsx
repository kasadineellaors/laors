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
      <Link href="/time" className="text-sm font-medium text-olive hover:underline">
        ← My clock
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-charcoal">Team time</h1>
        <p className="text-charcoal/70">Who is on the clock and recent shifts</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal/50">
          On the clock now ({openEntries.length})
        </h2>
        {openEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-charcoal/60">
            No one clocked in right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {openEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-olive/30 bg-olive/5 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-charcoal">{entry.user_name}</p>
                  <p className="text-xs text-charcoal/60">Since {formatTime(entry.clock_in_at)}</p>
                </div>
                <span className="text-sm font-semibold text-olive">Working</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal/50">
          Recent team shifts
        </h2>
        {recentEntries.length === 0 ? (
          <p className="text-sm text-charcoal/60">No time entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border bg-surface px-3 py-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-charcoal">{entry.user_name}</span>
                  <span className="text-charcoal/60">{formatDuration(entry.duration_minutes)}</span>
                </div>
                <p className="text-xs text-charcoal/50">
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
