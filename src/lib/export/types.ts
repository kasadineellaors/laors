export type ExportRecordType =
  | "treatments"
  | "feedings"
  | "feedings_cow_calf"
  | "calving"
  | "breeding"
  | "sales"
  | "invoices"
  | "jobs"
  | "cattle_moves"
  | "maternal_fertility"
  | "maternal_calf_crop"
  | "maternal_calving_ease"
  | "weaning";

export type ExportFormat = "csv" | "pdf";

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportDataset {
  title: string;
  filename: string;
  columns: ExportColumn[];
  rows: Record<string, string | number | null>[];
}

export const EXPORT_TYPE_LABELS: Record<ExportRecordType, string> = {
  treatments: "Treatments",
  feedings: "Feed log (stocker)",
  feedings_cow_calf: "Feed log (cow-calf)",
  calving: "Calving records",
  breeding: "Breeding records",
  sales: "Sales",
  invoices: "Invoices",
  jobs: "Jobs / tasks",
  cattle_moves: "Cattle moves",
  maternal_fertility: "Maternal fertility scores",
  maternal_calf_crop: "Calf crop report",
  maternal_calving_ease: "Sire calving ease validation",
  weaning: "Weaning records (seedstock)",
};
