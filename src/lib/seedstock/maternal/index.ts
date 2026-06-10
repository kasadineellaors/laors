import { loadMaternalDataset } from "./data";
import { computeCalvingDistribution } from "./calving-distribution";
import { computeSireCalvingEaseValidation } from "./calving-ease-validation";
import { computeCalfCropReports } from "./calf-crop";
import { computeFamilyProfiles } from "./family-performance";
import { computeFertilityScores } from "./fertility-score";
import { computeMaternalLifetimeValues } from "./lifetime-value";
import type { MaternalDashboard } from "./types";
import { computeMaternalYearTrends } from "./trends";

export type * from "./types";
export { loadMaternalDataset } from "./data";
export { computeFertilityScoreForDam } from "./fertility-score";
export { computeMaternalLifetimeValues } from "./lifetime-value";
export { getFamilyProfileForDam } from "./family-performance";
export { computeMaternalYearTrends } from "./trends";

export async function getMaternalDashboard(orgId: string): Promise<MaternalDashboard> {
  const dataset = await loadMaternalDataset(orgId);
  const fertilityScores = computeFertilityScores(dataset);
  const lifetimeValues = computeMaternalLifetimeValues(dataset);

  const scored = fertilityScores.filter((f) => f.recommendation !== "insufficient_data");
  const topPerformers = [...scored].sort((a, b) => b.score - a.score).slice(0, 10);
  const underperformers = [...scored]
    .sort((a, b) => a.score - b.score)
    .filter((f) => f.recommendation === "cull" || f.score < 50)
    .slice(0, 10);

  const calvingDistribution = computeCalvingDistribution(dataset);
  const sireCalvingEase = computeSireCalvingEaseValidation(dataset);
  const calfCropReports = computeCalfCropReports(dataset);
  const familyProfiles = computeFamilyProfiles(dataset);

  const dashboard: MaternalDashboard = {
    fertilityScores,
    topPerformers,
    underperformers,
    lifetimeValues,
    calvingDistribution,
    sireCalvingEase,
    calfCropReports,
    familyProfiles,
    yearTrends: {
      first21DayPercent: [],
      mortalityRate: [],
      calvesWeaned: [],
      avgFertilityScore: [],
    },
    datasetSummary: {
      females: dataset.femaleIds.size,
      breedingRecords: dataset.breeding.length,
      calvingRecords: dataset.calving.length,
      weaningRecords: dataset.weaning.length,
    },
  };

  dashboard.yearTrends = computeMaternalYearTrends(dashboard);
  return dashboard;
}
