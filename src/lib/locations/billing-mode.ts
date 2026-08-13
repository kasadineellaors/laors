export type BillingRateMode = "pasture" | "yardage";
export type LocationBillingOverride = "inherit" | "pasture" | "yardage";

export interface BillingModeTypeRow {
  id: string;
  tier: string;
  billing_rate_mode: BillingRateMode | null;
}

export interface BillingModeLocationRow {
  id: string;
  name: string;
  location_type_id: string;
  billing_rate_mode: LocationBillingOverride | null;
}

/** Resolve whether a lot at this location bills pasture or yardage. */
export function resolveBillingRateMode(
  location: Pick<BillingModeLocationRow, "billing_rate_mode"> | null | undefined,
  locationType: Pick<BillingModeTypeRow, "tier" | "billing_rate_mode"> | null | undefined,
): BillingRateMode {
  const override = location?.billing_rate_mode;
  if (override === "pasture" || override === "yardage") return override;

  const typeMode = locationType?.billing_rate_mode;
  if (typeMode === "pasture" || typeMode === "yardage") return typeMode;

  return "yardage";
}

export const BILLING_RATE_MODE_OPTIONS: { value: BillingRateMode; label: string }[] = [
  { value: "yardage", label: "Yardage (dry lot / pen)" },
  { value: "pasture", label: "Pasture (grass / range)" },
];

export const LOCATION_BILLING_OVERRIDE_OPTIONS: {
  value: LocationBillingOverride;
  label: string;
}[] = [
  { value: "inherit", label: "Use location type default" },
  { value: "yardage", label: "Yardage override" },
  { value: "pasture", label: "Pasture override" },
];
