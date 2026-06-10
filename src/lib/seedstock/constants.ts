import type { OperationMode } from "@/types/auth";
import type { SeedstockAnimalType } from "./types";

export function hasSeedstockMode(modes: OperationMode[] | string[] | null | undefined): boolean {
  return Boolean(modes?.includes("seedstock"));
}

export const SEEDSTOCK_TYPE_LABELS: Record<SeedstockAnimalType, string> = {
  bull: "Bull",
  cow: "Cow",
  heifer: "Heifer",
  steer: "Steer",
  other: "Other",
};

export type SeedstockSaleType = "live_animal" | "semen" | "embryo" | "other";

export const SEEDSTOCK_SALE_TYPE_LABELS: Record<SeedstockSaleType, string> = {
  live_animal: "Live animal",
  semen: "Semen",
  embryo: "Embryo",
  other: "Other",
};

export const ANIMAL_STATUS_LABELS = {
  active: "Active",
  sold: "Sold",
  dead: "Dead",
  archived: "Archived",
} as const;
