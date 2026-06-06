"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LocationTreeNode } from "@/lib/locations/types";
import type { SelectOption } from "@/lib/locations/options";
import { LocationTreeView } from "@/components/locations/location-tree-view";
import { AddLocationForm } from "@/components/locations/add-location-form";
import { EditLocationPanel } from "@/components/locations/edit-location-panel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationsSetupClientProps {
  tree: LocationTreeNode[];
  totalHead: number;
  orgId: string;
  parentOptions: SelectOption[];
  locationTypeOptions: SelectOption[];
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
}: LocationsSetupClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const flat = useMemo(() => flattenTree(tree), [tree]);
  const selected = flat.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
            ← Ranch Setup
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Ranch Map</h1>
          <p className="text-charcoal/70">{totalHead} head ranch-wide</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your land</CardTitle>
          <CardDescription>
            Tap a property or location to edit. Head counts roll up automatically.
          </CardDescription>
        </CardHeader>
        <LocationTreeView
          nodes={tree}
          selectedId={selectedId ?? undefined}
          onSelect={(node) => setSelectedId(node.id)}
        />
      </Card>

      {selected ? (
        <EditLocationPanel
          orgId={orgId}
          location={selected}
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
    </div>
  );
}
