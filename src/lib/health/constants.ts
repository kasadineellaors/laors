export const TREATMENT_TYPES = [
  { value: "vaccine", label: "Vaccine" },
  { value: "antibiotic", label: "Antibiotic" },
  { value: "dewormer", label: "Dewormer" },
  { value: "parasite", label: "Parasite control" },
  { value: "vitamin_mineral", label: "Preventive" },
  { value: "pain_relief", label: "Anti-inflammatory" },
  { value: "other", label: "Other" },
] as const;

export const TREATMENT_REASONS = [
  { value: "Respiratory", label: "Respiratory" },
  { value: "Digestive", label: "Digestive" },
  { value: "Lameness", label: "Lameness" },
  { value: "Pinkeye", label: "Pinkeye" },
  { value: "Injury", label: "Injury" },
  { value: "Parasite control", label: "Parasite control" },
  { value: "Vaccination", label: "Vaccination" },
  { value: "Reproductive", label: "Reproductive" },
  { value: "Preventive", label: "Preventive" },
  { value: "Other", label: "Other" },
] as const;

export type TreatmentTypeValue = (typeof TREATMENT_TYPES)[number]["value"];

export function treatmentTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = TREATMENT_TYPES.find((t) => t.value === value);
  return match?.label ?? value;
}
