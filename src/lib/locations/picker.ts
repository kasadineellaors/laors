import type { SelectOption } from "@/lib/locations/options";
import type { TreePickerOption } from "@/lib/locations/options";

export function findTreeNode(
  nodes: TreePickerOption[],
  id: string,
): TreePickerOption | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findTreeNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** Depth-0 property that contains this location. */
export function findPropertyRoot(
  tree: TreePickerOption[],
  locationId: string,
): TreePickerOption | null {
  const node = findTreeNode(tree, locationId);
  if (!node) return null;
  if (node.depth === 0) return node;

  let current: TreePickerOption | undefined = node;
  while (current?.parent_id) {
    const parent = findTreeNode(tree, current.parent_id);
    if (!parent) break;
    if (parent.depth === 0) return parent;
    current = parent;
  }

  return current.parent_id ? findTreeNode(tree, current.parent_id) : node;
}

export function collectDescendantIds(node: TreePickerOption): string[] {
  const ids: string[] = [node.id];
  for (const child of node.children) {
    ids.push(...collectDescendantIds(child));
  }
  return ids;
}

/** Pens and sub-locations under a parent property or location. */
export function listSubLocationOptions(parent: TreePickerOption): SelectOption[] {
  if (parent.children.length === 0) {
    return [{ value: parent.id, label: parent.name }];
  }

  const options: SelectOption[] = [];
  function walk(nodes: TreePickerOption[], prefix: string) {
    for (const node of nodes) {
      const label = prefix ? `${prefix} › ${node.name}` : node.name;
      options.push({ value: node.id, label });
      if (node.children.length > 0) walk(node.children, label);
    }
  }
  walk(parent.children, "");
  return options;
}

export function listParentLocationOptions(tree: TreePickerOption[]): SelectOption[] {
  return tree.map((node) => ({
    value: node.id,
    label: node.name,
    meta: { head_count: node.head_count },
  }));
}

export function splitLocationForPicker(
  tree: TreePickerOption[],
  locationId: string | null | undefined,
): { parentId: string; subLocationId: string } {
  if (!locationId) return { parentId: "", subLocationId: "" };

  const property = findPropertyRoot(tree, locationId);
  if (!property) return { parentId: "", subLocationId: locationId };

  if (locationId === property.id) {
    return {
      parentId: property.id,
      subLocationId: property.children.length === 0 ? property.id : "",
    };
  }

  return { parentId: property.id, subLocationId: locationId };
}

export function locationTreeHasSelectableSites(tree: TreePickerOption[]): boolean {
  return tree.length > 0;
}

export function resolveLocationSelection(
  tree: TreePickerOption[],
  parentId: string,
  subLocationId: string,
): string {
  if (subLocationId) return subLocationId;
  if (!parentId) return "";
  const parent = findTreeNode(tree, parentId);
  if (!parent) return "";
  if (parent.children.length === 0) return parent.id;
  return "";
}
