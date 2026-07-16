"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationTreeNode } from "@/lib/locations/types";
import type { LocationCattleGroup } from "@/lib/locations/rollups";
import type { SelectOption } from "@/lib/locations/options";
import { LocationTreeView } from "@/components/locations/location-tree-view";
import { AddLocationForm } from "@/components/locations/add-location-form";
import { EditLocationPanel } from "@/components/locations/edit-location-panel";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

interface LocationsSetupClientProps {
  tree: LocationTreeNode[];
  totalHead: number;
  orgId: string;
  parentOptions: SelectOption[];
  locationTypeOptions: SelectOption[];
  cattleGroupsByLocation: Record<string, LocationCattleGroup[]>;
  locationNamesById: Record<string, string>;
}

function flattenTree(nodes: LocationTreeNode[]): LocationTreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

export function LocationsSetupClient({
  tree,
  totalHead,
  orgId,
  parentOptions,
  locationTypeOptions,
  cattleGroupsByLocation,
  locationNamesById,
}: LocationsSetupClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const flat = useMemo(() => flattenTree(tree), [tree]);
  const selected = flat.find((n) => n.id === selectedId) ?? null;

  return (
    <ManageSubpageShell>
      <div>
        <ManageSubpageHeader
          title="Properties & Locations"
          subtitle="Organize your ranch into properties, pastures, pens, traps, and other locations."
        />
        <p className="mt-2 text-sm font-semibold tabular-nums text-navy">
          {totalHead} head ranch-wide
        </p>
      </div>

      <section aria-labelledby="ranch-structure-heading">
        <h2 id="ranch-structure-heading" className="sr-only">
          Ranch structure
        </h2>
        <p className="mb-3 text-sm text-text-secondary">
          Tap a property or location to edit. Head counts roll up automatically.
        </p>
        <LocationTreeView
          nodes={tree}
          selectedId={selectedId ?? undefined}
          onSelect={(node) => setSelectedId(node.id)}
        />
      </section>

      {selected ? (
        <EditLocationPanel
          orgId={orgId}
          location={selected}
          parentName={
            selected.parent_id ? locationNamesById[selected.parent_id] : null
          }
          cattleGroups={cattleGroupsByLocation[selected.id] ?? []}
          onClose={() => setSelectedId(null)}
          onUpdated={() => setSelectedId(null)}
        />
      ) : null}

      <AddLocationForm
        orgId={orgId}
        propertyOptions={parentOptions}
        locationTypeOptions={locationTypeOptions}
        onCreated={() => router.refresh()}
      />
    </ManageSubpageShell>
  );
}
