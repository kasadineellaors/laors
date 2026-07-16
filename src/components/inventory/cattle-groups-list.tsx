"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS } from "@/lib/lots/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StatusFilter = "all" | "open" | "closed";

interface CattleGroupsListProps {
  groups: CattleGroupSummary[];
}

export function CattleGroupsList({ groups }: CattleGroupsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [enterpriseFilter, setEnterpriseFilter] = useState("all");
  const [search, setSearch] = useState("");

  const enterpriseOptions = useMemo(() => {
    const types = [...new Set(groups.map((g) => g.enterprise_type).filter(Boolean))];
    return types.sort();
  }, [groups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (statusFilter === "open" && group.lot_status === "closed") return false;
      if (statusFilter === "closed" && group.lot_status !== "closed") return false;
      if (enterpriseFilter !== "all" && group.enterprise_type !== enterpriseFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        group.lot_number,
        group.name,
        group.location_breadcrumb,
        group.ownership_group_name,
        group.seller_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [groups, statusFilter, enterpriseFilter, search]);

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

  const sorted = [...filtered].sort((a, b) => {
    const locA = a.location_breadcrumb ?? "";
    const locB = b.location_breadcrumb ?? "";
    if (locA !== locB) return locA.localeCompare(locB);
    return (a.lot_number || a.name).localeCompare(b.lot_number || b.name);
  });

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold ${
      active
        ? "bg-olive text-white"
        : "border border-border bg-surface text-charcoal/70 hover:border-olive/40"
    }`;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lot, pen, owner, seller…"
          aria-label="Search lots"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={chipClass(statusFilter === "all")}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={chipClass(statusFilter === "open")}
            onClick={() => setStatusFilter("open")}
          >
            Open
          </button>
          <button
            type="button"
            className={chipClass(statusFilter === "closed")}
            onClick={() => setStatusFilter("closed")}
          >
            Closed
          </button>
        </div>
        {enterpriseOptions.length > 1 ? (
          <select
            value={enterpriseFilter}
            onChange={(e) => setEnterpriseFilter(e.target.value)}
            className="flex h-11 w-full rounded-lg border-2 border-border bg-surface px-3 text-sm"
            aria-label="Filter by enterprise"
          >
            <option value="all">All enterprises</option>
            {enterpriseOptions.map((type) => (
              <option key={type} value={type}>
                {ENTERPRISE_LABELS[type as keyof typeof ENTERPRISE_LABELS] ?? type}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
          No lots match your filters.
        </p>
      ) : (
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
      )}
    </div>
  );
}
