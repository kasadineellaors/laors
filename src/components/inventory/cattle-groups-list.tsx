"use client";

import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS } from "@/lib/lots/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CattleGroupsListProps {
  groups: CattleGroupSummary[];
}

export function CattleGroupsList({ groups }: CattleGroupsListProps) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No lots yet</CardTitle>
          <CardDescription>
            Receive a purchase to create a lot — head, costs, and pen flow through feed,
            health, sales, and billing.
          </CardDescription>
        </CardHeader>
        <Link href="/cattle/new">
          <Button fullWidth size="lg">
            Receive lot
          </Button>
        </Link>
      </Card>
    );
  }

  const sorted = [...groups].sort((a, b) => {
    const locA = a.location_breadcrumb ?? "";
    const locB = b.location_breadcrumb ?? "";
    if (locA !== locB) return locA.localeCompare(locB);
    return a.name.localeCompare(b.name);
  });

  return (
    <ul className="space-y-3">
      {sorted.map((group) => {
        const lotLabel = group.lot_number || group.name;
        const status =
          LOT_STATUS_LABELS[group.lot_status as keyof typeof LOT_STATUS_LABELS] ??
          group.lot_status;
        const enterprise =
          ENTERPRISE_LABELS[group.enterprise_type as keyof typeof ENTERPRISE_LABELS] ??
          group.enterprise_type;

        return (
        <li key={group.id}>
          <Link
            href={`/cattle/groups/${group.id}`}
            className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-olive/40 hover:bg-olive/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-charcoal">{lotLabel}</p>
                <p className="text-sm text-charcoal/60">
                  {group.location_breadcrumb ?? "No location assigned"}
                </p>
                <p className="text-xs text-charcoal/50">
                  {enterprise}
                  {status ? ` · ${status}` : ""}
                  {group.ownership_group_name ? ` · ${group.ownership_group_name}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-olive">{group.total_head}</p>
                <p className="text-xs text-charcoal/50">head</p>
              </div>
            </div>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
