import type { OperationMode } from "@/types/auth";

export type LocationTier = "property" | "location";

export interface SuggestedLocationType {
  name: string;
  pluralName: string;
  tier: LocationTier;
}

/** Mode-aware suggestions — copied into ranch config, never referenced globally at runtime. */
export function getSuggestedLocationTypes(
  modes: OperationMode[],
): SuggestedLocationType[] {
  const property: SuggestedLocationType = {
    name: "Property",
    pluralName: "Properties",
    tier: "property",
  };

  const locationTypes: SuggestedLocationType[] = [];

  if (modes.includes("cow_calf")) {
    locationTypes.push(
      { name: "Trap", pluralName: "Traps", tier: "location" },
      { name: "Pasture", pluralName: "Pastures", tier: "location" },
      { name: "Section", pluralName: "Sections", tier: "location" },
    );
  }

  if (modes.includes("stocker")) {
    locationTypes.push(
      { name: "Pen", pluralName: "Pens", tier: "location" },
      { name: "Lot", pluralName: "Lots", tier: "location" },
    );
  }

  if (locationTypes.length === 0) {
    locationTypes.push({
      name: "Area",
      pluralName: "Areas",
      tier: "location",
    });
  }

  // Dedupe by name
  const seen = new Set<string>();
  const uniqueLocations = locationTypes.filter((t) => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });

  return [property, ...uniqueLocations];
}

export const DEFAULT_PROPERTY_NAMES = [
  "Property 1",
  "Property 2",
  "Headquarters",
];

export const DEFAULT_FIRST_LOCATION_NAMES = [
  "Pasture 1",
  "Pasture 2",
  "Pen 1",
];
