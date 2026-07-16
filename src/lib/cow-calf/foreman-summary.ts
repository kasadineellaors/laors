import type { ForemanSummaryItem } from "./herd-types";
import type { CowCalfHerd, HerdInventorySummary } from "./herd-types";
import type { BreedingSummary } from "./breeding-types";
import type { CalvingSummary } from "./types";
import type { CalvingAlertInput } from "./calving-alerts";
import { buildCalvingAlerts } from "./calving-alerts";

export interface ForemanSummaryInput {
  inventory: HerdInventorySummary & { herdCount?: number };
  breeding: BreedingSummary;
  calving: CalvingSummary;
  calvingAlerts?: CalvingAlertInput;
  calvesReadyToWean?: number;
  herds: CowCalfHerd[];
  unassignedCowCount: number;
  openCowCount: number;
}

/** Rule-based Cow-Calf foreman summary — no external services. */
export function buildForemanSummary(input: ForemanSummaryInput): ForemanSummaryItem[] {
  const items: ForemanSummaryItem[] = [];

  if (input.breeding.activeExposures > 0) {
    items.push({
      id: "active-exposures",
      severity: "info",
      message: `${input.breeding.activeExposures} active bull exposure${input.breeding.activeExposures === 1 ? "" : "s"} in the breeding program.`,
      href: "/cow-calf/breeding?tab=exposures",
    });
  }

  if (input.breeding.overduePulls > 0) {
    items.push({
      id: "overdue-pulls",
      severity: "warning",
      message: `${input.breeding.overduePulls} bull exposure${input.breeding.overduePulls === 1 ? "" : "s"} open longer than 90 days — confirm pull dates.`,
      href: "/cow-calf/breeding?tab=exposures",
    });
  }

  if (input.breeding.recheck > 0) {
    items.push({
      id: "recheck-cows",
      severity: "warning",
      message: `${input.breeding.recheck} cow${input.breeding.recheck === 1 ? "" : "s"} marked for pregnancy recheck.`,
      href: "/cow-calf/breeding",
    });
  }

  if (input.breeding.dueNext14Days > 0) {
    items.push({
      id: "due-14",
      severity: "info",
      message: `${input.breeding.dueNext14Days} female${input.breeding.dueNext14Days === 1 ? "" : "s"} expected to calve in the next 14 days.`,
      href: "/cow-calf/breeding",
    });
  }

  if (input.breeding.dueNext30Days > input.breeding.dueNext14Days) {
    const within30 = input.breeding.dueNext30Days - input.breeding.dueNext14Days;
    if (within30 > 0) {
      items.push({
        id: "due-30",
        severity: "info",
        message: `${within30} more expected to calve within 30 days.`,
        href: "/cow-calf/breeding",
      });
    }
  }

  if (input.unassignedCowCount > 0) {
    items.push({
      id: "unassigned-cows",
      severity: "warning",
      message: `${input.unassignedCowCount} cow${input.unassignedCowCount === 1 ? "" : "s"} recorded without a current herd.`,
      href: "/cow-calf/cows",
    });
  }

  if (input.openCowCount > 0) {
    items.push({
      id: "open-cows",
      severity: "info",
      message: `${input.openCowCount} open cow${input.openCowCount === 1 ? "" : "s"} in the breeding herd.`,
      href: "/cow-calf/cows",
    });
  }

  const groupOnlyHerds = input.herds.filter((h) => h.recordkeeping_mode === "group");
  for (const herd of groupOnlyHerds) {
    items.push({
      id: `group-${herd.id}`,
      severity: "info",
      message: `${herd.name} is tracked as a group record (${herd.group_cows_count} cows, ${herd.group_calves_at_side_count} calves at side).`,
      href: `/cow-calf/herds/${herd.id}`,
    });
  }

  if (input.inventory.pairs > 0 && input.inventory.calvesAtSide > input.inventory.pairs) {
    const extra = input.inventory.calvesAtSide - input.inventory.pairs;
    items.push({
      id: "extra-calves",
      severity: "warning",
      message: `${extra} calf${extra === 1 ? "" : "ves"} at side without an active pair count (fostered, dry cows, or data entry).`,
      href: "/cow-calf/calves",
    });
  }

  if (input.calvingAlerts) {
    items.push(...buildCalvingAlerts(input.calvingAlerts));
  }

  if ((input.calvesReadyToWean ?? 0) > 0) {
    items.push({
      id: "ready-to-wean",
      severity: "info",
      message: `${input.calvesReadyToWean} calf${input.calvesReadyToWean === 1 ? "" : "ves"} at side ready to wean.`,
      href: "/cow-calf/weaning/new",
    });
  }

  return items;
}

export function foremanSummaryHeadline(items: ForemanSummaryItem[]): string {
  if (!items.length) {
    return "Everything looks on track for the cow-calf herd today.";
  }
  const warnings = items.filter((i) => i.severity === "warning" || i.severity === "critical");
  if (warnings.length) {
    return `${warnings.length} item${warnings.length === 1 ? "" : "s"} need attention today.`;
  }
  return `${items.length} update${items.length === 1 ? "" : "s"} for your cow-calf operation.`;
}
