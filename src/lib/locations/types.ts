export interface LocationRow {
  id: string;
  organization_id: string;
  location_type_id: string;
  parent_id: string | null;
  name: string;
  acres: number | null;
  capacity_head: number | null;
  status_id: string | null;
  depth: number;
  path: string | null;
  is_active: boolean;
}

export interface LocationTypeRow {
  id: string;
  name: string;
  plural_name: string | null;
  tier: "property" | "location";
}

export interface LocationTreeNode extends LocationRow {
  location_type: LocationTypeRow;
  children: LocationTreeNode[];
  head_count: number;
  capacity_percent: number | null;
}

export interface HeadCountByClassification {
  classification_id: string;
  classification_name: string;
  head_count: number;
}
