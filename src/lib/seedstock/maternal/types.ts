import type { AssistanceType, LossCause } from "./constants";
import type { MaternalYearTrends } from "./trends";

export type FertilityTrend = "up" | "down" | "stable";
export type RetentionRecommendation = "retain" | "monitor" | "cull" | "insufficient_data";

export interface MaternalAnimalRow {
  id: string;
  tag_number: string;
  name: string | null;
  animal_type: string;
  birth_date: string | null;
  dam_id: string | null;
  sire_id: string | null;
  dam_tag: string | null;
  sire_tag: string | null;
  epd_calving_ease: number | null;
  epd_birth_weight: number | null;
  status: string;
}

export interface MaternalBreedingRow {
  id: string;
  bred_at: string;
  dam_id: string | null;
  dam_tag: string | null;
  bull_id: string | null;
  sire_tag: string | null;
  breeding_method: string;
  pregnancy_status: string;
  expected_calving_date: string | null;
  breeding_context: string;
}

export interface MaternalCalvingRow {
  id: string;
  calved_at: string;
  dam_id: string | null;
  dam_tag: string | null;
  bull_id: string | null;
  sire_tag: string | null;
  calf_tag: string | null;
  calf_sex: string;
  birth_weight_lbs: number | null;
  outcome: string;
  calving_context: string;
  calving_ease_score: number | null;
  assistance_type: AssistanceType | null;
  loss_cause: LossCause | null;
  breeding_record_id: string | null;
}

export interface MaternalWeaningRow {
  id: string;
  calving_record_id: string | null;
  dam_id: string | null;
  calf_id: string | null;
  calf_tag: string | null;
  weaned_at: string;
  weaning_weight_lbs: number | null;
  retained_as_heifer: boolean;
}

export interface MaternalSaleRow {
  id: string;
  sale_date: string;
  individual_animal_id: string | null;
  total_amount: number | null;
  seedstock_sale_type: string | null;
  buyer_name: string | null;
}

export interface MaternalDataset {
  animals: MaternalAnimalRow[];
  breeding: MaternalBreedingRow[];
  calving: MaternalCalvingRow[];
  weaning: MaternalWeaningRow[];
  sales: MaternalSaleRow[];
  femaleIds: Set<string>;
  tagToFemaleId: Map<string, string>;
}

export interface FertilityScoreResult {
  animalId: string;
  tag: string;
  name: string | null;
  score: number;
  percentile: number;
  trend: FertilityTrend;
  recommendation: RetentionRecommendation;
  factors: {
    ageAtFirstCalvingMonths: number | null;
    openYears: number;
    avgCalvingIntervalDays: number | null;
    pregnancySuccessRate: number | null;
    calvesBorn: number;
    calvesWeaned: number;
    methodSuccess: Record<string, { attempts: number; successes: number }>;
  };
}

export interface CalvingPeriodBucket {
  key: "first_21" | "second_21" | "third_21" | "late";
  label: string;
  count: number;
  percent: number;
}

export interface CalvingDistributionYear {
  year: number;
  seasonStart: string | null;
  total: number;
  buckets: CalvingPeriodBucket[];
}

export interface SireGroupDistribution {
  sireKey: string;
  sireLabel: string;
  year: number;
  buckets: CalvingPeriodBucket[];
}

export interface CowFamilyDistribution {
  damFamilyKey: string;
  damFamilyLabel: string;
  year: number;
  buckets: CalvingPeriodBucket[];
}

export interface CalvingDistributionAnalytics {
  byYear: CalvingDistributionYear[];
  bySireGroup: SireGroupDistribution[];
  byCowFamily: CowFamilyDistribution[];
}

export interface FamilyMemberStats {
  count: number;
  conceptionRate: number | null;
  avgFertilityScore: number | null;
  avgSalePrice: number | null;
  marketed: number;
  retained: number;
  longevityYears: number | null;
}

export interface CowFamilyProfile {
  damId: string;
  damTag: string;
  damName: string | null;
  daughters: FamilyMemberStats;
  sons: FamilyMemberStats;
  granddaughters: FamilyMemberStats;
  totalOffspringRevenue: number;
}

export interface SireCalvingEaseValidation {
  bullId: string | null;
  sireKey: string;
  sireLabel: string;
  epdCalvingEase: number | null;
  epdBirthWeight: number | null;
  expectedPercentile: string | null;
  calvings: number;
  assistedCount: number;
  assistedRate: number;
  pullRate: number;
  cSectionRate: number;
  avgEaseScore: number | null;
  verdict: "matches" | "worse_than_expected" | "better_than_expected" | "insufficient_data";
}

export interface MaternalLifetimeValue {
  animalId: string;
  tag: string;
  name: string | null;
  lifetimeValue: number;
  calvesBorn: number;
  calvesWeaned: number;
  daughtersRetained: number;
  offspringRevenue: number;
  yearsInHerd: number | null;
  fertilityScore: number | null;
}

export interface CalfCropYearReport {
  year: number;
  calvesBorn: number;
  calvesWeaned: number;
  mortalityRate: number;
  replacementHeifers: number;
  bullsSold: number;
  femalesSold: number;
  cullPercent: number | null;
  losses: {
    calving_difficulty: number;
    disease: number;
    environmental: number;
    unknown: number;
  };
}

export interface MaternalDashboard {
  fertilityScores: FertilityScoreResult[];
  topPerformers: FertilityScoreResult[];
  underperformers: FertilityScoreResult[];
  lifetimeValues: MaternalLifetimeValue[];
  calvingDistribution: CalvingDistributionAnalytics;
  sireCalvingEase: SireCalvingEaseValidation[];
  calfCropReports: CalfCropYearReport[];
  familyProfiles: CowFamilyProfile[];
  yearTrends: MaternalYearTrends;
  datasetSummary: {
    females: number;
    breedingRecords: number;
    calvingRecords: number;
    weaningRecords: number;
  };
}
