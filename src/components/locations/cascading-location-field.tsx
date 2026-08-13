"use client";

import { useEffect, useMemo, useState } from "react";
import type { TreePickerOption } from "@/lib/locations/options";
import {
  findTreeNode,
  resolveLocationSelection,
  splitLocationForPicker,
} from "@/lib/locations/picker";
import { CascadingLocationPicker } from "@/components/locations/cascading-location-picker";
import { cn } from "@/lib/utils/cn";

interface CascadingLocationFieldProps {
  idPrefix: string;
  locationTree: TreePickerOption[];
  value: string;
  onChange: (locationId: string) => void;
  parentLabel?: string;
  subLocationLabel?: string;
  optional?: boolean;
  required?: boolean;
  className?: string;
  error?: string;
  describedBy?: string;
}

export function CascadingLocationField({
  idPrefix,
  locationTree,
  value,
  onChange,
  parentLabel = "Parent location",
  subLocationLabel = "Sub-location",
  optional = false,
  required = false,
  className,
  error,
  describedBy,
}: CascadingLocationFieldProps) {
  const split = useMemo(
    () => splitLocationForPicker(locationTree, value),
    [locationTree, value],
  );
  const [parentId, setParentId] = useState(split.parentId);
  const [subLocationId, setSubLocationId] = useState(split.subLocationId);

  useEffect(() => {
    setParentId(split.parentId);
    setSubLocationId(split.subLocationId);
  }, [split.parentId, split.subLocationId]);

  function handleParentChange(nextParentId: string) {
    setParentId(nextParentId);
    setSubLocationId("");
    if (!nextParentId) {
      onChange("");
      return;
    }
    const parent = findTreeNode(locationTree, nextParentId);
    if (parent && parent.children.length === 0) {
      onChange(parent.id);
      setSubLocationId(parent.id);
      return;
    }
    onChange("");
  }

  function handleSubLocationChange(nextSubLocationId: string) {
    setSubLocationId(nextSubLocationId);
    onChange(
      resolveLocationSelection(locationTree, parentId, nextSubLocationId) ||
        nextSubLocationId,
    );
  }

  const parent = parentId ? findTreeNode(locationTree, parentId) : null;
  const subRequired = required && Boolean(parent && parent.children.length > 0);

  return (
    <div
      className={cn(className)}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
    >
      <CascadingLocationPicker
        idPrefix={idPrefix}
        locationTree={locationTree}
        parentId={parentId}
        subLocationId={subLocationId}
        onParentChange={handleParentChange}
        onSubLocationChange={handleSubLocationChange}
        parentLabel={parentLabel}
        subLocationLabel={subLocationLabel}
        parentRequired={required && !optional}
        subLocationRequired={subRequired}
        allowAllParent={optional}
      />
      {error ? (
        <p className="mt-1 text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
