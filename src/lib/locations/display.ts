import type { LocationTreeNode } from "./types";

const CAPACITY_WARNING_THRESHOLD = 90;

export interface CapacityDisplay {
  primary: string;
  secondary: string | null;
  warning: boolean;
  overCapacity: boolean;
}

export function getLocationTypeLabel(
  tier: "property" | "location",
  typeName: string,
): string {
  return tier === "property" ? "Property" : typeName;
}

/** Display-only effective capacity; mirrors rollup denominator logic without mutating nodes. */
export function getEffectiveCapacityHead(node: LocationTreeNode): number | null {
  if (node.capacity_head != null && node.capacity_head > 0) {
    return node.capacity_head;
  }
  if (node.children.length === 0) return null;

  const childTotal = node.children.reduce((sum, child) => {
    const childCapacity = getEffectiveCapacityHead(child);
    return sum + (childCapacity ?? 0);
  }, 0);

  return childTotal > 0 ? childTotal : null;
}

export function formatCapacityDisplay(
  headCount: number,
  capacityHead: number | null,
  capacityPercent: number | null,
): CapacityDisplay {
  if (capacityHead == null || capacityHead <= 0) {
    return {
      primary: "Capacity not set",
      secondary: null,
      warning: false,
      overCapacity: false,
    };
  }

  const percent =
    capacityPercent ?? Math.round((headCount / capacityHead) * 100);
  const overCapacity = percent > 100;
  const warning = percent >= CAPACITY_WARNING_THRESHOLD;

  return {
    primary: `${headCount} / ${capacityHead} head`,
    secondary: `${percent}% full`,
    warning,
    overCapacity,
  };
}

export function formatNodeCapacity(node: LocationTreeNode): CapacityDisplay {
  const capacityHead = getEffectiveCapacityHead(node);
  return formatCapacityDisplay(
    node.head_count,
    capacityHead,
    node.capacity_percent,
  );
}
