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

/** Units a rancher can enter when logging feed for this ration. */
export function getFeedEntryUnitOptions(rationUnit: string): string[] {
  const normalizedRation = normalizeFeedUnit(rationUnit);
  if (isWeightFeedUnit(normalizedRation)) {
    const options = ["lb", "ton", "cwt"];
    if (normalizedRation === "kg") options.push("kg");
    const unique = [normalizedRation, ...options.filter((u) => u !== normalizedRation)];
    return [...new Set(unique)];
  }
  return [rationUnit.trim() || "unit"];
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
