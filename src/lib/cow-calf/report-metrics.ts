/** Live calving % for a period (0–100, one decimal). */
export function calvingLiveRatePct(live: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((live / total) * 1000) / 10;
}

/** Average of numeric weights; returns null when no values. */
export function averageWeight(weights: number[]): number | null {
  if (!weights.length) return null;
  const sum = weights.reduce((s, w) => s + w, 0);
  return Math.round((sum / weights.length) * 10) / 10;
}

export function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

export function formatLbs(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString()} lbs`;
}
