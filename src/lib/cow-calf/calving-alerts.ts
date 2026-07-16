import type { ForemanSummaryItem } from "./herd-types";

export type TwinStatus = "single" | "twin" | "triplet" | "unknown";

export interface CalvingAlertCounts {
  dueNext7Days: number;
  dueNext14Days: number;
  overdueNoCalving: number;
  bredWithoutDueDate: number;
  unprocessedCalves: number;
}

export interface CalvingAlertInput {
  dueNext7Days: number;
  overdueNoCalving: number;
  bredWithoutDueDate: number;
  unprocessedCalves: number;
  calfWithoutCalvingRecord: number;
  multiDamCalves: number;
}

/** Build foreman items from pre-fetched calving alert counts. */
export function buildCalvingAlerts(input: CalvingAlertInput): ForemanSummaryItem[] {
  const items: ForemanSummaryItem[] = [];

  if (input.dueNext7Days > 0) {
    items.push({
      id: "calving-due-7",
      severity: "info",
      message: `${input.dueNext7Days} female${input.dueNext7Days === 1 ? "" : "s"} expected to calve in the next 7 days.`,
      href: "/cow-calf/breeding?tab=due",
    });
  }

  if (input.overdueNoCalving > 0) {
    items.push({
      id: "calving-overdue",
      severity: "warning",
      message: `${input.overdueNoCalving} expected calving date${input.overdueNoCalving === 1 ? "" : "s"} passed with no calving recorded.`,
      href: "/cow-calf/breeding?tab=due",
    });
  }

  if (input.bredWithoutDueDate > 0) {
    items.push({
      id: "calving-missing-due",
      severity: "warning",
      message: `${input.bredWithoutDueDate} bred cow${input.bredWithoutDueDate === 1 ? "" : "s"} without an expected calving date.`,
      href: "/cow-calf/breeding",
    });
  }

  if (input.unprocessedCalves > 0) {
    items.push({
      id: "calves-unprocessed",
      severity: "warning",
      message: `${input.unprocessedCalves} calf${input.unprocessedCalves === 1 ? "" : "ves"} at side without birth processing recorded.`,
      href: "/cow-calf/processing",
    });
  }

  if (input.calfWithoutCalvingRecord > 0) {
    items.push({
      id: "calf-missing-calving",
      severity: "warning",
      message: `${input.calfWithoutCalvingRecord} registered calf${input.calfWithoutCalvingRecord === 1 ? "" : "ves"} without a calving record.`,
      href: "/cow-calf/calves",
    });
  }

  if (input.multiDamCalves > 0) {
    items.push({
      id: "calf-multi-dam",
      severity: "critical",
      message: `${input.multiDamCalves} calf${input.multiDamCalves === 1 ? "" : "ves"} linked to more than one active dam — review relationships.`,
      href: "/cow-calf/calves",
    });
  }

  return items;
}

export function inferTwinStatus(calfCount: number): TwinStatus {
  if (calfCount <= 1) return "single";
  if (calfCount === 2) return "twin";
  if (calfCount >= 3) return "triplet";
  return "unknown";
}

export function calfSexToAnimalSex(sex: string): string | null {
  if (sex === "bull_calf") return "male";
  if (sex === "heifer_calf") return "female";
  return null;
}
