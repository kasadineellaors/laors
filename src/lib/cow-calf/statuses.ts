import type { ReproductiveStatus, CalfLifecycleStatus } from "./inventory-calculations";

export const COW_REPRODUCTIVE_STATUS_LABELS: Record<ReproductiveStatus, string> = {
  active_breeding_cow: "Active breeding cow",
  exposed: "Exposed",
  bred: "Bred",
  open: "Open",
  heavy_bred: "Heavy bred",
  calved: "Calved",
  nursing: "Nursing",
  dry: "Dry",
  replacement_heifer: "Replacement heifer",
  cull: "Cull",
  sold: "Sold",
  deceased: "Deceased",
};

export const CALF_LIFECYCLE_STATUS_LABELS: Record<CalfLifecycleStatus, string> = {
  at_side: "At side",
  preconditioned: "Preconditioned",
  weaned: "Weaned",
  replacement: "Replacement",
  feeder: "Feeder",
  sold: "Sold",
  deceased: "Deceased",
};

export const BULL_STATUS_LABELS = {
  active_breeding: "Active breeding bull",
  turned_out: "Turned out",
  resting: "Resting",
  yearling: "Yearling bull",
  sale: "Sale bull",
  cull: "Cull",
  sold: "Sold",
  deceased: "Deceased",
} as const;

export const HERD_STATUS_LABELS = {
  active: "Active",
  archived: "Archived",
  closed: "Closed",
} as const;

export const RECORDKEEPING_MODE_LABELS = {
  individual: "Individual records",
  group: "Group record",
  mixed: "Mixed recordkeeping",
} as const;

export const COW_CALF_NAV_ITEMS = [
  { href: "/cow-calf", label: "Overview", exact: true },
  { href: "/cow-calf/herds", label: "Herds" },
  { href: "/cow-calf/cows", label: "Cows" },
  { href: "/cow-calf/calves", label: "Calves" },
  { href: "/cow-calf/bulls", label: "Bulls" },
  { href: "/cow-calf/breeding", label: "Breeding" },
  { href: "/cow-calf/calving", label: "Calving" },
  { href: "/cow-calf/processing", label: "Processing" },
  { href: "/cow-calf/weaning", label: "Weaning" },
  { href: "/cow-calf/sales", label: "Sales" },
  { href: "/cow-calf/reports", label: "Reports" },
] as const;
