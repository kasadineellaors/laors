import type { BreedingSummary } from "./breeding-types";
import type { ForemanSummaryItem } from "./herd-types";
import type { HerdInventorySummary } from "./herd-types";

export interface CowCalfReproductionReport {
  summary: BreedingSummary;
  pregnancyRatePct: number | null;
  pregnancyRateLabel: string;
  checkedFemales: number;
}

export interface CowCalfCalvingReport {
  yearToDate: number;
  yearToDateLive: number;
  yearToDateLiveRatePct: number | null;
  thisMonth: number;
  allTimeLive: number;
  allTimeTotal: number;
}

export interface CowCalfWeaningReport {
  yearToDate: number;
  thisMonth: number;
  calvesReadyToWean: number;
  avgWeaningWeightLbs: number | null;
}

export interface CowCalfExitReport {
  salesLast30Days: number;
  headSoldLast30Days: number;
  lossesLast30Days: number;
}

export interface CowCalfReportSnapshot {
  inventory: HerdInventorySummary & { herdCount: number };
  reproduction: CowCalfReproductionReport;
  calving: CowCalfCalvingReport;
  weaning: CowCalfWeaningReport;
  exits: CowCalfExitReport;
  unprocessedCalves: number;
  dataQuality: ForemanSummaryItem[];
}
