import type { LocationRow, LocationTreeNode, LocationTypeRow } from "./types";

export function buildLocationTree(
  locations: LocationRow[],
  types: Map<string, LocationTypeRow>,
  headCountByLocation: Map<string, number>,
): LocationTreeNode[] {
  const nodeMap = new Map<string, LocationTreeNode>();

  for (const loc of locations) {
    if (!loc.is_active) continue;
    const type = types.get(loc.location_type_id);
    if (!type) continue;

    const directHead = headCountByLocation.get(loc.id) ?? 0;
    nodeMap.set(loc.id, {
      ...loc,
      location_type: type,
      children: [],
      head_count: directHead,
      capacity_percent: null,
    });
  }

  const roots: LocationTreeNode[] = [];

  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else if (node.depth === 0) {
      roots.push(node);
    }
  }

  for (const root of nodeMap.values()) {
    rollupHeadCount(root);
    rollupCapacityPercent(root);
  }

  sortTree(roots);
  return roots;
}

function rollupHeadCount(node: LocationTreeNode): number {
  let total = node.head_count;
  for (const child of node.children) {
    total += rollupHeadCount(child);
  }
  node.head_count = total;
  return total;
}

function rollupCapacityPercent(node: LocationTreeNode): void {
  for (const child of node.children) {
    rollupCapacityPercent(child);
  }

  if (node.capacity_head && node.capacity_head > 0) {
    node.capacity_percent = Math.round((node.head_count / node.capacity_head) * 100);
  } else if (node.children.length > 0) {
    const childCapacities = node.children
      .map((c) => c.capacity_head ?? 0)
      .reduce((a, b) => a + b, 0);
    if (childCapacities > 0) {
      node.capacity_percent = Math.round((node.head_count / childCapacities) * 100);
    }
  }
}

function sortTree(nodes: LocationTreeNode[]): void {
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  for (const node of nodes) {
    sortTree(node.children);
  }
}

export function flattenTree(nodes: LocationTreeNode[]): LocationTreeNode[] {
  const result: LocationTreeNode[] = [];
  function walk(list: LocationTreeNode[]) {
    for (const node of list) {
      result.push(node);
      walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

export function getBreadcrumb(
  locationId: string,
  locations: LocationRow[],
): LocationRow[] {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const chain: LocationRow[] = [];
  let current = byId.get(locationId);
  while (current) {
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}

/** Returns location id and all descendant ids (for subtree filters). */
export function getSubtreeIds(
  locationId: string,
  locations: LocationRow[],
): string[] {
  const node = locations.find((l) => l.id === locationId);
  if (!node?.path) return [locationId];

  const prefix = node.path;
  return locations
    .filter((l) => l.path === prefix || l.path?.startsWith(`${prefix}.`))
    .map((l) => l.id);
}

export function isDescendantOf(
  location: LocationRow,
  ancestorId: string,
  locations: LocationRow[],
): boolean {
  const ancestor = locations.find((l) => l.id === ancestorId);
  if (!ancestor?.path || !location.path) return false;
  return location.path === ancestor.path || location.path.startsWith(`${ancestor.path}.`);
}
