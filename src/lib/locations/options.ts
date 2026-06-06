import { createClient } from "@/lib/supabase/server";
import { getLocationTreeWithRollups } from "./rollups";
import { flattenTree, getBreadcrumb } from "./tree";
import type { LocationRow } from "./types";

export type RanchOptionType =
  | "location_types"
  | "locations"
  | "locations_property_tier"
  | "locations_location_tier"
  | "classifications"
  | "ownership_groups"
  | "movement_reasons"
  | "adjustment_reasons"
  | "task_categories"
  | "financial_categories"
  | "location_statuses";

export interface SelectOption {
  value: string;
  label: string;
  meta?: Record<string, string | number | null>;
}

export interface TreePickerOption {
  id: string;
  name: string;
  depth: number;
  head_count: number;
  parent_id: string | null;
  type_name: string;
  breadcrumb: string;
  children: TreePickerOption[];
}

export async function getRanchOptions(
  orgId: string,
  optionType: RanchOptionType,
): Promise<SelectOption[]> {
  const supabase = await createClient();

  switch (optionType) {
    case "location_types": {
      const { data } = await supabase
        .from("location_types")
        .select("id, name, plural_name, tier")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      return (data ?? []).map((r) => ({
        value: r.id,
        label: r.name,
        meta: { tier: r.tier, plural_name: r.plural_name },
      }));
    }
    case "locations_property_tier": {
      const { data } = await supabase
        .from("location_types")
        .select("id")
        .eq("organization_id", orgId)
        .eq("tier", "property")
        .eq("is_active", true);
      const typeIds = (data ?? []).map((t) => t.id);
      if (!typeIds.length) return [];
      const { data: locs } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .in("location_type_id", typeIds)
        .order("name");
      return (locs ?? []).map((l) => ({ value: l.id, label: l.name }));
    }
    case "locations_location_tier": {
      const { data } = await supabase
        .from("location_types")
        .select("id")
        .eq("organization_id", orgId)
        .eq("tier", "location")
        .eq("is_active", true);
      const typeIds = (data ?? []).map((t) => t.id);
      if (!typeIds.length) return [];
      const { data: locs } = await supabase
        .from("locations")
        .select("id, name, parent_id")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .in("location_type_id", typeIds)
        .order("name");
      return (locs ?? []).map((l) => ({
        value: l.id,
        label: l.name,
        meta: { parent_id: l.parent_id },
      }));
    }
    case "classifications": {
      const { data } = await supabase
        .from("cattle_classifications")
        .select("id, name, short_code")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      return (data ?? []).map((r) => ({
        value: r.id,
        label: r.short_code ? `${r.name} (${r.short_code})` : r.name,
        meta: { name: r.name, short_code: r.short_code },
      }));
    }
    case "ownership_groups": {
      const { data } = await supabase
        .from("ownership_groups")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      return (data ?? []).map((r) => ({ value: r.id, label: r.name }));
    }
    case "movement_reasons": {
      const { data } = await supabase
        .from("movement_reasons")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []).map((r) => ({ value: r.id, label: r.name }));
    }
    case "adjustment_reasons": {
      const { data } = await supabase
        .from("adjustment_reasons")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []).map((r) => ({ value: r.id, label: r.name }));
    }
    case "task_categories": {
      const { data } = await supabase
        .from("task_categories")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []).map((r) => ({ value: r.id, label: r.name }));
    }
    case "financial_categories": {
      const { data } = await supabase
        .from("financial_categories")
        .select("id, name, category_type")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []).map((r) => ({
        value: r.id,
        label: r.name,
        meta: { category_type: r.category_type },
      }));
    }
    case "location_statuses": {
      const { data } = await supabase
        .from("location_statuses")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []).map((r) => ({ value: r.id, label: r.name }));
    }
    default:
      return [];
  }
}

function toTreePickerOptions(
  nodes: Awaited<ReturnType<typeof getLocationTreeWithRollups>>,
  allLocations: LocationRow[],
): TreePickerOption[] {
  return nodes.map((node) => {
    const breadcrumb = getBreadcrumb(node.id, allLocations)
      .map((l) => l.name)
      .join(" › ");
    return {
      id: node.id,
      name: node.name,
      depth: node.depth,
      head_count: node.head_count,
      parent_id: node.parent_id,
      type_name: node.location_type.name,
      breadcrumb,
      children: toTreePickerOptions(node.children, allLocations),
    };
  });
}

export async function getTreePickerOptions(
  orgId: string,
  filters?: { tier?: "property" | "location"; subtreeOf?: string },
): Promise<TreePickerOption[]> {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const allLocations = (locations ?? []) as LocationRow[];
  let tree = await getLocationTreeWithRollups(orgId);

  if (filters?.subtreeOf) {
    const flat = flattenTree(tree);
    const subtree = flat.find((n) => n.id === filters.subtreeOf);
    tree = subtree ? [subtree] : [];
  }

  if (filters?.tier === "property") {
    tree = tree.filter((n) => n.depth === 0);
    return toTreePickerOptions(
      tree.map((n) => ({ ...n, children: [] })),
      allLocations,
    );
  }

  let options = toTreePickerOptions(tree, allLocations);

  if (filters?.tier === "location") {
    const stripProperties = (nodes: TreePickerOption[]): TreePickerOption[] =>
      nodes.flatMap((n) => [
        ...(n.depth > 0 ? [n] : []),
        ...stripProperties(n.children),
      ]);
    options = stripProperties(options);
  }

  return options;
}
