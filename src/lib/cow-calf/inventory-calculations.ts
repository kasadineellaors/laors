/**
 * Cow-Calf inventory calculation helpers.
 * Pure functions — safe to unit test; never used by Stocker lot logic.
 */

export type CowCalfAnimalRole = "cow" | "heifer" | "bull" | "calf" | "replacement" | "other";

export type CowCalfLifecycleStatus =
  | "active"
  | "sold"
  | "dead"
  | "archived";

export type ReproductiveStatus =
  | "active_breeding_cow"
  | "exposed"
  | "bred"
  | "open"
  | "heavy_bred"
  | "calved"
  | "nursing"
  | "dry"
  | "replacement_heifer"
  | "cull"
  | "sold"
  | "deceased";

export type CalfLifecycleStatus =
  | "at_side"
  | "preconditioned"
  | "weaned"
  | "replacement"
  | "feeder"
  | "sold"
  | "deceased";

export type NursingStatus = "at_side" | "weaned" | "ended";

export interface CowCalfAnimalSnapshot {
  id: string;
  role: CowCalfAnimalRole;
  lifecycleStatus: CowCalfLifecycleStatus;
  reproductiveStatus?: ReproductiveStatus | null;
  calfLifecycleStatus?: CalfLifecycleStatus | null;
}

export interface DamCalfRelationshipSnapshot {
  damId: string;
  calfId: string;
  nursingStatus: NursingStatus;
  fostered?: boolean;
  isActive?: boolean;
}

export interface GroupHerdCounts {
  groupCows: number;
  groupCalvesAtSide: number;
  groupBulls: number;
  groupReplacements: number;
}

export interface CowCalfInventoryInput {
  animals: CowCalfAnimalSnapshot[];
  relationships: DamCalfRelationshipSnapshot[];
  groupCounts?: GroupHerdCounts;
  /** Individual animals explicitly tracked (not double-counted with group totals). */
  individuallyIdentifiedIds?: Set<string>;
}

export interface CowCalfInventoryTotals {
  cows: number;
  calvesAtSide: number;
  pairs: number;
  bulls: number;
  replacements: number;
  totalPhysicalHead: number;
  individuallyIdentified: number;
  groupOnlyCows: number;
  groupOnlyCalvesAtSide: number;
}

const INACTIVE_LIFECYCLE: CowCalfLifecycleStatus[] = ["sold", "dead", "archived"];

const NON_PAIR_DAM_STATUS: ReproductiveStatus[] = ["dry", "sold", "deceased", "cull"];

function isActiveAnimal(animal: CowCalfAnimalSnapshot): boolean {
  return !INACTIVE_LIFECYCLE.includes(animal.lifecycleStatus);
}

function isActiveCalfAtSide(
  animal: CowCalfAnimalSnapshot,
  relationships: DamCalfRelationshipSnapshot[],
): boolean {
  if (!isActiveAnimal(animal) || animal.role !== "calf") return false;
  if (animal.calfLifecycleStatus === "weaned" || animal.calfLifecycleStatus === "sold" || animal.calfLifecycleStatus === "deceased") {
    return false;
  }
  const rel = relationships.find(
    (r) => r.calfId === animal.id && r.isActive !== false && r.nursingStatus === "at_side",
  );
  if (rel) return true;
  return animal.calfLifecycleStatus === "at_side";
}

function isActiveCow(animal: CowCalfAnimalSnapshot): boolean {
  if (!isActiveAnimal(animal)) return false;
  return animal.role === "cow" || animal.role === "heifer";
}

function isActiveBull(animal: CowCalfAnimalSnapshot): boolean {
  if (!isActiveAnimal(animal)) return false;
  return animal.role === "bull";
}

function isReplacement(animal: CowCalfAnimalSnapshot): boolean {
  if (!isActiveAnimal(animal)) return false;
  return (
    animal.role === "replacement" ||
    animal.reproductiveStatus === "replacement_heifer" ||
    animal.calfLifecycleStatus === "replacement"
  );
}

/** Central pair and head-count calculation for Cow-Calf enterprise only. */
export function calculateCowCalfInventory(input: CowCalfInventoryInput): CowCalfInventoryTotals {
  const { animals, relationships, groupCounts } = input;
  const identified = input.individuallyIdentifiedIds ?? new Set(animals.map((a) => a.id));

  const activeAnimals = animals.filter(isActiveAnimal);

  const calfIdsAtSide = new Set(
    activeAnimals
      .filter((a) => isActiveCalfAtSide(a, relationships))
      .map((a) => a.id),
  );

  const individualCows = activeAnimals.filter(isActiveCow).length;
  const individualCalvesAtSide = calfIdsAtSide.size;
  const individualBulls = activeAnimals.filter(isActiveBull).length;
  const individualReplacements = activeAnimals.filter(isReplacement).length;

  const pairs = relationships.filter(
    (r) =>
      r.nursingStatus === "at_side" &&
      r.isActive !== false &&
      calfIdsAtSide.has(r.calfId) &&
      activeAnimals.some(
        (a) =>
          a.id === r.damId &&
          isActiveCow(a) &&
          !(a.reproductiveStatus && NON_PAIR_DAM_STATUS.includes(a.reproductiveStatus)),
      ),
  ).length;

  const group = groupCounts ?? {
    groupCows: 0,
    groupCalvesAtSide: 0,
    groupBulls: 0,
    groupReplacements: 0,
  };

  const groupOnlyCows = Math.max(0, group.groupCows);
  const groupOnlyCalvesAtSide = Math.max(0, group.groupCalvesAtSide);

  const cows = individualCows + groupOnlyCows;
  const calvesAtSide = individualCalvesAtSide + groupOnlyCalvesAtSide;
  const bulls = individualBulls + Math.max(0, group.groupBulls);
  const replacements = individualReplacements + Math.max(0, group.groupReplacements);

  const totalPhysicalHead = cows + calvesAtSide + bulls + replacements;

  return {
    cows,
    calvesAtSide,
    pairs,
    bulls,
    replacements,
    totalPhysicalHead,
    individuallyIdentified: identified.size,
    groupOnlyCows,
    groupOnlyCalvesAtSide,
  };
}

/** Reconcile mixed recordkeeping — group totals must not double-count identified animals. */
export function reconcileMixedHerdCounts(
  groupCounts: GroupHerdCounts,
  identifiedCowCount: number,
  identifiedCalfAtSideCount: number,
): GroupHerdCounts {
  return {
    groupCows: Math.max(0, groupCounts.groupCows - identifiedCowCount),
    groupCalvesAtSide: Math.max(0, groupCounts.groupCalvesAtSide - identifiedCalfAtSideCount),
    groupBulls: groupCounts.groupBulls,
    groupReplacements: groupCounts.groupReplacements,
  };
}
