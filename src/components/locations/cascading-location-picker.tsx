"use client";

import { useEffect, useMemo } from "react";
import type { TreePickerOption } from "@/lib/locations/options";
import {
  findTreeNode,
  listParentLocationOptions,
  listSubLocationOptions,
} from "@/lib/locations/picker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

const selectClass =
  "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

interface CascadingLocationPickerProps {
  idPrefix: string;
  locationTree: TreePickerOption[];
  parentId: string;
  subLocationId: string;
  onParentChange: (parentId: string) => void;
  onSubLocationChange: (subLocationId: string) => void;
  parentLabel?: string;
  subLocationLabel?: string;
  parentRequired?: boolean;
  subLocationRequired?: boolean;
  allowAllParent?: boolean;
  allowAllSub?: boolean;
  className?: string;
}

export function CascadingLocationPicker({
  idPrefix,
  locationTree,
  parentId,
  subLocationId,
  onParentChange,
  onSubLocationChange,
  parentLabel = "Parent location",
  subLocationLabel = "Sub-location",
  parentRequired = false,
  subLocationRequired = false,
  allowAllParent = false,
  allowAllSub = false,
  className,
}: CascadingLocationPickerProps) {
  const parentOptions = useMemo(
    () => listParentLocationOptions(locationTree),
    [locationTree],
  );

  const parent = parentId ? findTreeNode(locationTree, parentId) : null;

  const subOptions = useMemo(() => {
    if (!parentId) return [];
    const parent = findTreeNode(locationTree, parentId);
    if (!parent) return [];
    return listSubLocationOptions(parent);
  }, [locationTree, parentId]);

  const showSubPicker =
    Boolean(parentId) &&
    Boolean(parent && parent.children.length > 0);

  useEffect(() => {
    if (!parentId) return;
    const node = findTreeNode(locationTree, parentId);
    if (!node) return;

    if (node.children.length === 0) {
      if (subLocationId !== node.id) onSubLocationChange(node.id);
      return;
    }

    if (subLocationRequired && !subLocationId) {
      const subs = listSubLocationOptions(node);
      if (subs.length === 1) onSubLocationChange(subs[0].value);
    }
  }, [
    parentId,
    locationTree,
    subLocationId,
    subLocationRequired,
    onSubLocationChange,
  ]);

  function handleParentChange(nextParentId: string) {
    onParentChange(nextParentId);
    onSubLocationChange("");
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label htmlFor={`${idPrefix}-parent`}>{parentLabel}</Label>
        <select
          id={`${idPrefix}-parent`}
          value={parentId}
          onChange={(e) => handleParentChange(e.target.value)}
          required={parentRequired}
          className={selectClass}
        >
          {allowAllParent ? <option value="">All areas</option> : <option value="">Select parent</option>}
          {parentOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.meta?.head_count != null ? ` (${opt.meta.head_count} hd)` : ""}
            </option>
          ))}
        </select>
      </div>

      {showSubPicker ? (
        <div>
          <Label htmlFor={`${idPrefix}-sub`}>{subLocationLabel}</Label>
          <select
            id={`${idPrefix}-sub`}
            value={subLocationId}
            onChange={(e) => onSubLocationChange(e.target.value)}
            required={subLocationRequired}
            className={selectClass}
          >
            {allowAllSub ? <option value="">All pens in this area</option> : <option value="">Select sub-location</option>}
            {subOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
