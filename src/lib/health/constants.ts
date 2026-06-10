export const TREATMENT_TYPES = [
  { value: "vaccine", label: "Vaccine" },
  { value: "antibiotic", label: "Antibiotic" },
  { value: "dewormer", label: "Dewormer" },
  { value: "parasite", label: "Parasite control" },
  { value: "vitamin_mineral", label: "Vitamin / mineral" },
  { value: "pain_relief", label: "Pain relief" },
  { value: "other", label: "Other" },
] as const;

export type TreatmentTypeValue = (typeof TREATMENT_TYPES)[number]["value"];

export function treatmentTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = TREATMENT_TYPES.find((t) => t.value === value);
  return match?.label ?? value;
}
