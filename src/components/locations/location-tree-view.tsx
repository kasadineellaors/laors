"use client";

import { useCallback, useMemo, useState } from "react";
import type { LocationTreeNode } from "@/lib/locations/types";
import {
  formatNodeCapacity,
  getLocationTypeLabel,
} from "@/lib/locations/display";
import { cn } from "@/lib/utils/cn";

interface LocationTreeViewProps {
  nodes: LocationTreeNode[];
  onSelect?: (node: LocationTreeNode) => void;
  selectedId?: string;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn(
        "shrink-0 text-text-secondary transition-transform",
        expanded ? "rotate-90" : "rotate-0",
      )}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationNode({
  node,
  depth,
  onSelect,
  selectedId,
  expandedIds,
  onToggle,
}: {
  node: LocationTreeNode;
  depth: number;
  onSelect?: (node: LocationTreeNode) => void;
  selectedId?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const typeLabel = getLocationTypeLabel(node.location_type.tier, node.location_type.name);
  const capacity = formatNodeCapacity(node);
  const indent = Math.min(depth * 12, 48);

  return (
    <div role="none">
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={depth + 1}
        aria-selected={isSelected}
        className="relative"
      >
        {depth > 0 ? (
          <span
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-border-neutral"
            style={{ left: `${indent - 6}px` }}
            aria-hidden
          />
        ) : null}
        <div
          className={cn(
            "flex items-stretch rounded-lg transition-colors",
            isSelected ? "bg-tan/40 ring-2 ring-navy" : "hover:bg-tan/20",
          )}
          style={{ marginLeft: depth > 0 ? `${indent}px` : undefined }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              className={cn(
                "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-l-lg",
                "text-text-secondary hover:bg-tan/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy",
              )}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`}
            >
              <ChevronIcon expanded={isExpanded} />
            </button>
          ) : (
            <span className="min-w-11 shrink-0" aria-hidden />
          )}
          <button
            type="button"
            onClick={() => onSelect?.(node)}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy",
              hasChildren ? "rounded-r-lg" : "rounded-lg",
            )}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy">{node.name}</p>
              <p className="text-xs text-text-secondary">
                {typeLabel}
                {node.acres != null && node.acres > 0 ? ` · ${node.acres} ac` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-bold tabular-nums text-navy">
                {node.head_count}{" "}
                <span className="text-xs font-medium text-text-secondary">head</span>
              </p>
              <p
                className={cn(
                  "text-xs text-text-secondary",
                  capacity.overCapacity && "font-semibold text-status-critical",
                  capacity.warning && !capacity.overCapacity && "font-medium text-status-warning",
                )}
              >
                {capacity.primary}
                {capacity.secondary ? (
                  <>
                    <br />
                    <span
                      className={cn(
                        capacity.overCapacity && "text-status-critical",
                        capacity.warning && !capacity.overCapacity && "text-status-warning",
                      )}
                    >
                      {capacity.secondary}
                      {capacity.overCapacity ? " · Over capacity" : null}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </button>
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <div role="group" className="space-y-1">
          {node.children.map((child) => (
            <LocationNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}

      {!hasChildren && node.location_type.tier === "property" ? (
        <p
          className="mt-1 text-sm text-text-secondary"
          style={{ marginLeft: `${indent + 44}px` }}
        >
          No locations have been added beneath this property.
        </p>
      ) : null}
    </div>
  );
}

function collectExpandableIds(nodes: LocationTreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.children.length > 0) {
      ids.push(node.id);
    }
  }
  return ids;
}

export function LocationTreeView({ nodes, onSelect, selectedId }: LocationTreeViewProps) {
  const defaultExpanded = useMemo(() => new Set(collectExpandableIds(nodes)), [nodes]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded);

  const onToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border-2 border-dashed border-border-neutral bg-surface-white px-6 py-10 text-center">
        <p className="font-semibold text-navy">No properties have been added.</p>
        <p className="mt-1 text-sm text-text-secondary">
          Add your first property to begin organizing ranch locations.
        </p>
      </div>
    );
  }

  return (
    <div
      role="tree"
      aria-label="Ranch properties and locations"
      className="space-y-1 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-2"
    >
      {nodes.map((node) => (
        <LocationNode
          key={node.id}
          node={node}
          depth={0}
          onSelect={onSelect}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
