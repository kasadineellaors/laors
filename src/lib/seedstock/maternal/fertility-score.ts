import type { MaternalDataset } from "./types";
import type { FertilityScoreResult, FertilityTrend, RetentionRecommendation } from "./types";
import {
  breedingForDam,
  calvingsForDam,
  getFemaleAnimals,
  resolveDamId,
  weaningForDam,
} from "./data";

export type { FertilityTrend, RetentionRecommendation };

function monthsBetween(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function avgIntervalDays(dates: string[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(`${sorted[i - 1]}T12:00:00`).getTime();
    const b = new Date(`${sorted[i]}T12:00:00`).getTime();
    gaps.push((b - a) / (1000 * 60 * 60 * 24));
  }
  return gaps.reduce((s, g) => s + g, 0) / gaps.length;
}

function countOpenYears(breeding: MaternalDataset["breeding"], calvings: MaternalDataset["calving"]): number {
  const yearsWithBreed = new Set(breeding.map((b) => b.bred_at.slice(0, 4)));
  const yearsWithCalve = new Set(calvings.map((c) => c.calved_at.slice(0, 4)));
  let open = 0;
  for (const y of yearsWithBreed) {
    const hadOpen = breeding.some(
      (b) => b.bred_at.startsWith(y) && b.pregnancy_status === "open",
    );
    const hadCalve = yearsWithCalve.has(y);
    if (hadOpen || (!hadCalve && breeding.some((b) => b.bred_at.startsWith(y)))) {
      if (!hadCalve && breeding.some((b) => b.bred_at.startsWith(y) && b.pregnancy_status !== "open")) {
        open += 1;
      } else if (hadOpen && !hadCalve) {
        open += 1;
      }
    }
  }
  return open;
}

function pregnancySuccessRate(
  breeding: MaternalDataset["breeding"],
  calvings: MaternalDataset["calving"],
): number | null {
  if (!breeding.length) return null;
  const successes = breeding.filter(
    (b) => b.pregnancy_status === "confirmed" || b.pregnancy_status === "bred",
  ).length;
  const calved = calvings.filter((c) => c.outcome === "live").length;
  const denom = breeding.length;
  const rate = Math.max(successes, calved) / denom;
  return Math.min(1, rate);
}

function methodSuccess(
  breeding: MaternalDataset["breeding"],
  calvings: MaternalDataset["calving"],
): Record<string, { attempts: number; successes: number }> {
  const out: Record<string, { attempts: number; successes: number }> = {};
  for (const b of breeding) {
    const m = b.breeding_method;
    if (!out[m]) out[m] = { attempts: 0, successes: 0 };
    out[m].attempts += 1;
    if (b.pregnancy_status === "confirmed" || b.pregnancy_status === "bred") {
      out[m].successes += 1;
    }
  }
  if (calvings.some((c) => c.outcome === "live")) {
    for (const m of Object.keys(out)) {
      out[m].successes = Math.max(out[m].successes, 1);
    }
  }
  return out;
}

function computeScoreForDam(
  dataset: MaternalDataset,
  damId: string,
): Omit<FertilityScoreResult, "percentile" | "trend" | "recommendation"> | null {
  const animal = dataset.animals.find((a) => a.id === damId);
  if (!animal) return null;

  const breeding = breedingForDam(dataset, damId);
  const calvings = calvingsForDam(dataset, damId);
  const weaned = weaningForDam(dataset, damId);

  if (!breeding.length && !calvings.length) {
    return {
      animalId: damId,
      tag: animal.tag_number,
      name: animal.name,
      score: 0,
      factors: {
        ageAtFirstCalvingMonths: null,
        openYears: 0,
        avgCalvingIntervalDays: null,
        pregnancySuccessRate: null,
        calvesBorn: calvings.length,
        calvesWeaned: weaned.length,
        methodSuccess: {},
      },
    };
  }

  let score = 50;
  const liveCalvings = calvings.filter((c) => c.outcome === "live");
  const calvingDates = liveCalvings.map((c) => c.calved_at);
  const firstCalving = calvingDates.sort()[0] ?? null;

  let ageAtFirstCalvingMonths: number | null = null;
  if (animal.birth_date && firstCalving) {
    ageAtFirstCalvingMonths = monthsBetween(animal.birth_date, firstCalving);
    if (ageAtFirstCalvingMonths >= 24 && ageAtFirstCalvingMonths <= 36) score += 12;
    else if (ageAtFirstCalvingMonths < 24) score -= 8;
    else if (ageAtFirstCalvingMonths > 48) score -= 5;
    else score += 4;
  }

  const openYears = countOpenYears(breeding, calvings);
  score -= openYears * 8;

  const interval = avgIntervalDays(calvingDates);
  if (interval != null) {
    if (interval >= 350 && interval <= 400) score += 15;
    else if (interval > 450) score -= 12;
    else if (interval < 320) score -= 5;
    else score += 5;
  }

  const pregRate = pregnancySuccessRate(breeding, calvings);
  if (pregRate != null) {
    score += Math.round(pregRate * 20);
  }

  score += Math.min(liveCalvings.length * 3, 15);
  score += Math.min(weaned.length * 2, 10);

  const methods = methodSuccess(breeding, calvings);
  for (const m of Object.values(methods)) {
    if (m.attempts > 0) {
      const r = m.successes / m.attempts;
      if (r >= 0.7) score += 3;
      else if (r < 0.4) score -= 5;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    animalId: damId,
    tag: animal.tag_number,
    name: animal.name,
    score,
    factors: {
      ageAtFirstCalvingMonths,
      openYears,
      avgCalvingIntervalDays: interval,
      pregnancySuccessRate: pregRate,
      calvesBorn: calvings.length,
      calvesWeaned: weaned.length,
      methodSuccess: methods,
    },
  };
}

function trendForDam(
  dataset: MaternalDataset,
  damId: string,
): FertilityTrend {
  const breeding = breedingForDam(dataset, damId);
  const recent = breeding.filter((b) => {
    const y = new Date(b.bred_at).getFullYear();
    return y >= new Date().getFullYear() - 2;
  });
  const older = breeding.filter((b) => {
    const y = new Date(b.bred_at).getFullYear();
    return y < new Date().getFullYear() - 2;
  });
  if (!recent.length || !older.length) return "stable";

  const recentSuccess = recent.filter((b) => b.pregnancy_status !== "open").length / recent.length;
  const olderSuccess = older.filter((b) => b.pregnancy_status !== "open").length / older.length;
  if (recentSuccess > olderSuccess + 0.15) return "up";
  if (recentSuccess < olderSuccess - 0.15) return "down";
  return "stable";
}

function recommendation(
  score: number,
  factors: FertilityScoreResult["factors"],
): RetentionRecommendation {
  if (factors.calvesBorn === 0 && factors.pregnancySuccessRate == null) {
    return "insufficient_data";
  }
  if (score >= 75 && factors.openYears <= 1) return "retain";
  if (score < 45 || factors.openYears >= 3) return "cull";
  return "monitor";
}

function percentile(rank: number, total: number): number {
  if (total <= 1) return 100;
  return Math.round(((total - rank) / (total - 1)) * 100);
}

export function computeFertilityScores(dataset: MaternalDataset): FertilityScoreResult[] {
  const females = getFemaleAnimals(dataset);
  const raw = females
    .map((f) => computeScoreForDam(dataset, f.id))
    .filter((r): r is NonNullable<typeof r> => r != null && (r.score > 0 || r.factors.calvesBorn > 0));

  const sorted = [...raw].sort((a, b) => b.score - a.score);

  return sorted.map((r, i) => ({
    ...r,
    percentile: percentile(i, sorted.length),
    trend: trendForDam(dataset, r.animalId),
    recommendation: recommendation(r.score, r.factors),
  }));
}

export function computeFertilityScoreForDam(
  dataset: MaternalDataset,
  damId: string,
): FertilityScoreResult | null {
  const all = computeFertilityScores(dataset);
  return all.find((f) => f.animalId === damId) ?? null;
}
