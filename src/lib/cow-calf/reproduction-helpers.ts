import type { PregnancyStatus } from "./breeding-types";
import type { ReproductiveStatus } from "./inventory-calculations";

export interface ExposureWindow {
  id: string;
  bullId: string | null;
  damId: string | null;
  exposureStart: string;
  exposureEnd: string | null;
}

/** Days between two ISO date strings (inclusive of partial overlap logic). */
export function daysBetween(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000));
}

export function exposureDurationDays(
  exposureStart: string,
  exposureEnd: string | null,
  asOf: string = new Date().toISOString().slice(0, 10),
): number {
  const end = exposureEnd && exposureEnd < asOf ? exposureEnd : asOf;
  return daysBetween(exposureStart, end);
}

/** Detect overlapping active bull exposures for the same bull. */
export function findOverlappingBullExposures(
  exposures: ExposureWindow[],
  candidate: ExposureWindow,
): ExposureWindow[] {
  if (!candidate.bullId) return [];

  const candidateEnd = candidate.exposureEnd ?? "9999-12-31";

  return exposures.filter((existing) => {
    if (existing.id === candidate.id) return false;
    if (existing.bullId !== candidate.bullId) return false;
    const existingEnd = existing.exposureEnd ?? "9999-12-31";
    return candidate.exposureStart <= existingEnd && existing.exposureStart <= candidateEnd;
  });
}

export function cowToBullRatio(femaleCount: number, bullCount: number): string | null {
  if (bullCount <= 0 || femaleCount <= 0) return null;
  const ratio = femaleCount / bullCount;
  return `${ratio.toFixed(1)}:1`;
}

export function pregnancyRateFromResults(results: {
  bred: number;
  open: number;
  recheck: number;
  unknown: number;
}): { rate: number | null; denominator: number; label: string } {
  const denominator = results.bred + results.open;
  if (denominator === 0) {
    return {
      rate: null,
      denominator: 0,
      label: "Pregnancy rate requires at least one Bred or Open result.",
    };
  }
  const rate = Math.round((results.bred / denominator) * 1000) / 10;
  return {
    rate,
    denominator,
    label: `Pregnancy rate: ${rate}% (${results.bred} bred ÷ ${denominator} checked; Unknown and Recheck excluded).`,
  };
}

export function pregnancyStatusToReproductiveStatus(
  status: PregnancyStatus,
): ReproductiveStatus | null {
  switch (status) {
    case "bred":
    case "confirmed":
      return "bred";
    case "open":
      return "open";
    case "recheck":
      return "exposed";
    case "unknown":
      return null;
    default:
      return null;
  }
}

export function isActiveExposure(exposureEnd: string | null, asOf: string): boolean {
  return !exposureEnd || exposureEnd >= asOf;
}
