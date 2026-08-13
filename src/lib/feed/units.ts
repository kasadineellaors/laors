/** Weight conversions through pounds — ration recipes stay in the ration's native unit. */

const POUNDS_PER: Record<string, number> = {
  lb: 1,
  ton: 2000,
  cwt: 100,
  kg: 2.2046226218,
};

const ALIASES: Record<string, keyof typeof POUNDS_PER> = {
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  "#": "lb",
  ton: "ton",
  tons: "ton",
  tn: "ton",
  cwt: "cwt",
  cwts: "cwt",
  kg: "kg",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",
};

const COUNT_UNITS = new Set(["bag", "bags", "bale", "bales", "flake", "flakes", "unit", "units"]);

export function normalizeFeedUnit(unit: string): string {
  const key = unit.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  if (COUNT_UNITS.has(key)) return key.replace(/s$/, "");
  return key;
}

export function isWeightFeedUnit(unit: string): boolean {
  return normalizeFeedUnit(unit) in POUNDS_PER;
}

/** Default entry unit when logging feed — ranchers usually think in pounds. */
export function defaultFeedEntryUnit(rationUnit: string): string {
  const normalizedRation = normalizeFeedUnit(rationUnit);
  if (isWeightFeedUnit(normalizedRation)) return "lb";
  return rationUnit.trim() || "unit";
}

/** Units a rancher can enter when logging feed for this ration. */
export function getFeedEntryUnitOptions(rationUnit: string): string[] {
  const normalizedRation = normalizeFeedUnit(rationUnit);
  if (isWeightFeedUnit(normalizedRation)) {
    const options = ["lb", "ton", "cwt"];
    if (normalizedRation === "kg") options.push("kg");
    if (!options.includes(normalizedRation)) options.push(normalizedRation);
    return [...new Set(options)];
  }
  return [rationUnit.trim() || "unit"];
}

/**
 * Feed item quantity (in the feed item's native unit) consumed per 1 ration unit.
 * Amount mode: quantity_per_ration_unit is already in feed item units.
 * Percent mode: inclusion is a weight fraction of the ration, converted to feed item units.
 */
export function feedItemQtyPerOneRationUnit(
  quantityPerRationUnit: number,
  inclusionPercent: number | null | undefined,
  rationUnit: string,
  feedItemUnit: string,
): number | null {
  if (!Number.isFinite(quantityPerRationUnit) || quantityPerRationUnit <= 0) return null;

  if (inclusionPercent != null) {
    const fraction = inclusionPercent / 100;
    const oneRationInItemUnits = convertFeedQuantity(1, rationUnit, feedItemUnit);
    if (oneRationInItemUnits == null) return null;
    return Math.round(fraction * oneRationInItemUnits * 10000) / 10000;
  }

  return quantityPerRationUnit;
}

export function convertFeedQuantity(
  amount: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (!Number.isFinite(amount)) return null;

  const from = normalizeFeedUnit(fromUnit);
  const to = normalizeFeedUnit(toUnit);
  if (from === to) return amount;

  const fromLb = POUNDS_PER[from];
  const toLb = POUNDS_PER[to];
  if (fromLb == null || toLb == null) return null;

  const pounds = amount * fromLb;
  return Math.round((pounds / toLb) * 10000) / 10000;
}

export function formatFeedUnitLabel(unit: string): string {
  const normalized = normalizeFeedUnit(unit);
  if (normalized === "lb") return "lb";
  if (normalized === "ton") return "ton";
  if (normalized === "cwt") return "cwt";
  if (normalized === "kg") return "kg";
  return unit.trim();
}
