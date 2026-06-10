import { CALVING_PERIOD_LABELS } from "./constants";
import type {
  CalvingDistributionAnalytics,
  CalvingPeriodBucket,
  MaternalDataset,
} from "./types";
import { getFemaleAnimals, resolveDamId } from "./data";

type PeriodKey = CalvingPeriodBucket["key"];

function bucketForDay(day: number): PeriodKey {
  if (day <= 21) return "first_21";
  if (day <= 42) return "second_21";
  if (day <= 63) return "third_21";
  return "late";
}

function daysFromSeasonStart(calvedAt: string, seasonStart: string): number {
  const c = new Date(`${calvedAt}T12:00:00`).getTime();
  const s = new Date(`${seasonStart}T12:00:00`).getTime();
  return Math.max(0, Math.round((c - s) / (1000 * 60 * 60 * 24)));
}

function buildBuckets(counts: Record<PeriodKey, number>, total: number): CalvingPeriodBucket[] {
  const keys: PeriodKey[] = ["first_21", "second_21", "third_21", "late"];
  return keys.map((key) => ({
    key,
    label: CALVING_PERIOD_LABELS[key],
    count: counts[key],
    percent: total > 0 ? Math.round((counts[key] / total) * 1000) / 10 : 0,
  }));
}

function emptyCounts(): Record<PeriodKey, number> {
  return { first_21: 0, second_21: 0, third_21: 0, late: 0 };
}

function relevantCalvings(dataset: MaternalDataset) {
  return dataset.calving.filter((c) => {
    const damId = resolveDamId(dataset, c.dam_id, c.dam_tag);
    return damId != null && c.outcome === "live";
  });
}

export function computeCalvingDistribution(dataset: MaternalDataset): CalvingDistributionAnalytics {
  const calvings = relevantCalvings(dataset);
  const years = [...new Set(calvings.map((c) => c.calved_at.slice(0, 4)))].sort().reverse();

  const byYear = years.map((yearStr) => {
    const year = Number(yearStr);
    const yearCalvings = calvings.filter((c) => c.calved_at.startsWith(yearStr));
    const seasonStart =
      yearCalvings.length > 0
        ? yearCalvings.map((c) => c.calved_at).sort()[0]
        : null;
    const counts = emptyCounts();
    for (const c of yearCalvings) {
      const start = seasonStart ?? c.calved_at;
      const day = daysFromSeasonStart(c.calved_at, start);
      counts[bucketForDay(day)] += 1;
    }
    return {
      year,
      seasonStart,
      total: yearCalvings.length,
      buckets: buildBuckets(counts, yearCalvings.length),
    };
  });

  const bySireGroup: CalvingDistributionAnalytics["bySireGroup"] = [];
  for (const yearStr of years) {
    const year = Number(yearStr);
    const yearCalvings = calvings.filter((c) => c.calved_at.startsWith(yearStr));
    const seasonStart =
      yearCalvings.length > 0 ? yearCalvings.map((c) => c.calved_at).sort()[0] : null;
    const sireMap = new Map<string, { label: string; counts: Record<PeriodKey, number> }>();

    for (const c of yearCalvings) {
      const sireKey = c.bull_id ?? c.sire_tag ?? "unknown";
      const bull = c.bull_id ? dataset.animals.find((a) => a.id === c.bull_id) : null;
      const label = bull
        ? bull.name
          ? `${bull.tag_number} — ${bull.name}`
          : bull.tag_number
        : c.sire_tag ?? "Unknown sire";
      if (!sireMap.has(sireKey)) {
        sireMap.set(sireKey, { label, counts: emptyCounts() });
      }
      const start = seasonStart ?? c.calved_at;
      const day = daysFromSeasonStart(c.calved_at, start);
      sireMap.get(sireKey)!.counts[bucketForDay(day)] += 1;
    }

    for (const [sireKey, { label, counts }] of sireMap) {
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      if (total === 0) continue;
      bySireGroup.push({
        sireKey,
        sireLabel: label,
        year,
        buckets: buildBuckets(counts, total),
      });
    }
  }

  const females = getFemaleAnimals(dataset);
  const byCowFamily: CalvingDistributionAnalytics["byCowFamily"] = [];

  for (const yearStr of years) {
    const year = Number(yearStr);
    const yearCalvings = calvings.filter((c) => c.calved_at.startsWith(yearStr));
    const seasonStart =
      yearCalvings.length > 0 ? yearCalvings.map((c) => c.calved_at).sort()[0] : null;

    for (const dam of females) {
      const damCalvings = yearCalvings.filter(
        (c) => resolveDamId(dataset, c.dam_id, c.dam_tag) === dam.id,
      );
      if (!damCalvings.length) continue;
      const counts = emptyCounts();
      for (const c of damCalvings) {
        const start = seasonStart ?? c.calved_at;
        const day = daysFromSeasonStart(c.calved_at, start);
        counts[bucketForDay(day)] += 1;
      }
      byCowFamily.push({
        damFamilyKey: dam.id,
        damFamilyLabel: dam.name ? `${dam.tag_number} — ${dam.name}` : dam.tag_number,
        year,
        buckets: buildBuckets(counts, damCalvings.length),
      });
    }
  }

  return { byYear, bySireGroup, byCowFamily };
}
