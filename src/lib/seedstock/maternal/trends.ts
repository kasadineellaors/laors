import type { MaternalDashboard } from "./types";

export interface YearTrendPoint {
  year: number;
  value: number;
  label?: string;
}

export interface MaternalYearTrends {
  first21DayPercent: YearTrendPoint[];
  mortalityRate: YearTrendPoint[];
  calvesWeaned: YearTrendPoint[];
  avgFertilityScore: YearTrendPoint[];
}

export function computeMaternalYearTrends(dashboard: MaternalDashboard): MaternalYearTrends {
  const years = [
    ...new Set([
      ...dashboard.calvingDistribution.byYear.map((y) => y.year),
      ...dashboard.calfCropReports.map((r) => r.year),
    ]),
  ].sort();

  const first21DayPercent = dashboard.calvingDistribution.byYear
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((y) => ({
      year: y.year,
      value: y.buckets.find((b) => b.key === "first_21")?.percent ?? 0,
    }));

  const mortalityRate = dashboard.calfCropReports
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((r) => ({
      year: r.year,
      value: r.mortalityRate,
    }));

  const calvesWeaned = dashboard.calfCropReports
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((r) => ({
      year: r.year,
      value: r.calvesWeaned,
    }));

  const fertilityByYear = new Map<number, number[]>();
  for (const f of dashboard.fertilityScores) {
    if (f.factors.calvesBorn === 0) continue;
    const latestYear = new Date().getFullYear();
    fertilityByYear.set(latestYear, [...(fertilityByYear.get(latestYear) ?? []), f.score]);
  }

  const avgFertilityScore = years.map((year) => {
    const scores = fertilityByYear.get(year) ?? [];
    const avg =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { year, value: avg };
  }).filter((p) => p.value > 0);

  return {
    first21DayPercent,
    mortalityRate,
    calvesWeaned,
    avgFertilityScore,
  };
}
