import type { OperationMode } from "@/types/auth";

export function hasCowCalfMode(modes: OperationMode[] | string[] | null | undefined): boolean {
  return Boolean(modes?.includes("cow_calf"));
}

export const CALF_SEX_LABELS = {
  bull_calf: "Bull calf",
  heifer_calf: "Heifer calf",
  unknown: "Unknown",
} as const;

export const CALVING_OUTCOME_LABELS = {
  live: "Live",
  stillborn: "Stillborn",
  died: "Died after birth",
} as const;

export const CALVING_EASE_SCORE_LABELS: Record<number, string> = {
  1: "Unassisted (1)",
  2: "Minor assistance (2)",
  3: "Moderate pull (3)",
  4: "Hard pull (4)",
  5: "C-section / severe (5)",
};

export const ASSISTANCE_TYPE_LABELS = {
  unassisted: "Unassisted",
  easy_pull: "Easy pull",
  hard_pull: "Hard pull",
  c_section: "C-section",
  unknown: "Unknown",
} as const;

export const LOSS_CAUSE_LABELS = {
  calving_difficulty: "Calving difficulty",
  disease: "Disease",
  environmental: "Environmental",
  unknown: "Unknown",
} as const;

export const ANIMAL_STATUS_LABELS = {
  active: "Active",
  sold: "Sold",
  dead: "Dead",
  archived: "Archived",
} as const;

export const COW_TYPE_LABELS = {
  cow: "Cow",
  heifer: "Heifer",
} as const;

export const BREEDING_METHOD_LABELS = {
  natural: "Natural service",
  ai: "Artificial insemination",
  embryo: "Embryo transfer",
  other: "Other",
} as const;

export const PREGNANCY_STATUS_LABELS = {
  bred: "Bred",
  confirmed: "Confirmed pregnant",
  open: "Open",
  unknown: "Unknown",
} as const;

/** Typical gestation for cattle — used as a default expected calving hint. */
export const GESTATION_DAYS = 283;

export function expectedCalvingFromBredDate(bredAt: string): string {
  const d = new Date(`${bredAt}T12:00:00`);
  d.setDate(d.getDate() + GESTATION_DAYS);
  return d.toISOString().slice(0, 10);
}
