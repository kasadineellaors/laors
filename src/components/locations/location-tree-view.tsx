"use client";

import type { LocationTreeNode } from "@/lib/locations/types";
import { cn } from "@/lib/utils/cn";

interface LocationTreeViewProps {
  nodes: LocationTreeNode[];
  onSelect?: (node: LocationTreeNode) => void;
  selectedId?: string;
}

function LocationNode({
  node,
  depth,
  onSelect,
  selectedId,
}: {
  node: LocationTreeNode;
  depth: number;
  onSelect?: (node: LocationTreeNode) => void;
  selectedId?: string;
}) {
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect?.(node)}
        className={cn(
          "flex w-full touch-target items-center justify-between rounded-lg px-3 py-3 text-left transition-colors",
          isSelected ? "bg-olive/15 ring-2 ring-olive" : "hover:bg-tan-light/40",
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <div>
          <p className="font-semibold text-charcoal">{node.name}</p>
          <p className="text-xs text-charcoal/60">
            {node.location_type.name}
            {node.acres ? ` · ${node.acres} ac` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-olive">{node.head_count}</p>
          <p className="text-xs text-charcoal/50">head</p>
          {node.capacity_percent != null && node.capacity_percent > 100 ? (
            <p className="text-xs font-semibold text-rust">Over capacity</p>
          ) : node.capacity_percent != null ? (
            <p className="text-xs text-charcoal/50">{node.capacity_percent}% cap</p>
          ) : null}
        </div>
      </button>
      {node.children.map((child) => (
        <LocationNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

export function LocationTreeView({ nodes, onSelect, selectedId }: LocationTreeViewProps) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-surface-muted/50 px-6 py-10 text-center">
        <p className="font-semibold text-charcoal">No locations yet</p>
        <p className="mt-1 text-sm text-charcoal/60">
          Add a property, then add locations underneath it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-xl border border-border bg-surface p-2">
      {nodes.map((node) => (
        <LocationNode
          key={node.id}
          node={node}
          depth={0}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
