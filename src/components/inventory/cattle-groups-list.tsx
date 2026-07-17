"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import {
  getLotLocationLabel,
  getLotOwnerName,
  getLotPropertyName,
  getLotReceivedDate,
} from "@/lib/inventory/lot-display";
import { ENTERPRISE_LABELS } from "@/lib/lots/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CattleLotCard } from "@/components/inventory/cattle-lot-card";
import { ArchivedToggleSection } from "@/components/ui/archived-toggle-section";
import { cn } from "@/lib/utils/cn";

type StatusFilter = "all" | "open" | "closed";

interface CattleGroupsListProps {
  groups: CattleGroupSummary[];
  archivedGroups?: CattleGroupSummary[];
  canManageCattle?: boolean;
  className?: string;
}

function statusPillClass(active: boolean) {
  return cn(
    "min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
    active
      ? "bg-navy text-white"
      : "border border-border-neutral bg-surface-white text-navy hover:border-navy/40",
  );
}

export function CattleGroupsList({
  groups,
  archivedGroups = [],
  canManageCattle = false,
  className,
}: CattleGroupsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [enterpriseFilter, setEnterpriseFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [receivedAfter, setReceivedAfter] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const enterpriseOptions = useMemo(() => {
    const types = [...new Set(groups.map((g) => g.enterprise_type).filter(Boolean))];
    return types.sort();
  }, [groups]);

  const propertyOptions = useMemo(() => {
    const names = groups
      .map((g) => getLotPropertyName(g))
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)].sort();
  }, [groups]);

  const locationOptions = useMemo(() => {
    const names = groups.map((g) => getLotLocationLabel(g)).filter((name) => name !== "No location assigned");
    return [...new Set(names)].sort();
  }, [groups]);

  const ownerOptions = useMemo(() => {
    const names = groups
      .map((g) => getLotOwnerName(g))
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)].sort();
  }, [groups]);

  const sellerOptions = useMemo(() => {
    const names = groups
      .map((g) => g.seller_name)
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)].sort();
  }, [groups]);

  const hasAdvancedFilters =
    enterpriseOptions.length > 1 ||
    propertyOptions.length > 1 ||
    locationOptions.length > 1 ||
    ownerOptions.length > 1 ||
    sellerOptions.length > 1;

  const activeFilterCount = [
    enterpriseFilter !== "all",
    propertyFilter !== "all",
    locationFilter !== "all",
    ownerFilter !== "all",
    sellerFilter !== "all",
    receivedAfter !== "",
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (statusFilter === "open" && group.lot_status === "closed") return false;
      if (statusFilter === "closed" && group.lot_status !== "closed") return false;
      if (enterpriseFilter !== "all" && group.enterprise_type !== enterpriseFilter) return false;
      if (propertyFilter !== "all" && getLotPropertyName(group) !== propertyFilter) return false;
      if (locationFilter !== "all" && getLotLocationLabel(group) !== locationFilter) return false;
      if (ownerFilter !== "all" && getLotOwnerName(group) !== ownerFilter) return false;
      if (sellerFilter !== "all" && group.seller_name !== sellerFilter) return false;
      if (receivedAfter) {
        const received = getLotReceivedDate(group);
        if (!received || received < receivedAfter) return false;
      }
      if (!q) return true;
      const haystack = [
        group.lot_number,
        group.name,
        group.location_breadcrumb,
        group.location_name,
        group.ownership_group_name,
        group.customer_name,
        group.seller_name,
        group.source_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    groups,
    statusFilter,
    enterpriseFilter,
    propertyFilter,
    locationFilter,
    ownerFilter,
    sellerFilter,
    receivedAfter,
    search,
  ]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const locA = a.location_breadcrumb ?? "";
        const locB = b.location_breadcrumb ?? "";
        if (locA !== locB) return locA.localeCompare(locB);
        return (a.lot_number || a.name).localeCompare(b.lot_number || b.name);
      }),
    [filtered],
  );

  function clearFilters() {
    setSearch("");
    setEnterpriseFilter("all");
    setPropertyFilter("all");
    setLocationFilter("all");
    setOwnerFilter("all");
    setSellerFilter("all");
    setReceivedAfter("");
  }

  if (groups.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border-neutral bg-surface-white px-6 py-12 text-center",
          className,
        )}
      >
        <h2 className="text-lg font-semibold text-navy">No lots yet</h2>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          Receive cattle to create your first active lot — head, costs, and location flow through
          feed, health, sales, and billing.
        </p>
        {canManageCattle ? (
          <Link href="/cattle/new" className="mt-6">
            <Button size="md">+ Receive Cattle</Button>
          </Link>
        ) : null}
      </div>
    );
  }

  const emptyMessage = (() => {
    if (search.trim()) {
      return {
        title: "No lots match your search.",
        body: "Clear the search or update the filters.",
        showReceive: false,
      };
    }
    if (statusFilter === "open" && activeFilterCount === 0) {
      return {
        title: "No open lots found.",
        body: "Receive cattle to create your first active lot.",
        showReceive: canManageCattle,
      };
    }
    if (statusFilter === "closed" && activeFilterCount === 0) {
      return {
        title: "No closed lots found.",
        body: "Closed lots appear here after closeout.",
        showReceive: false,
      };
    }
    return {
      title: "No lots match your filters.",
      body: "Clear the search or update the filters.",
      showReceive: false,
    };
  })();

  return (
    <div className={cn("flex flex-1 flex-col space-y-4", className)}>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lot, location, owner, or seller..."
            aria-label="Search lots"
            className="flex-1"
          />
          {hasAdvancedFilters ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              className="shrink-0 sm:min-w-[7.5rem]"
              onClick={() => setShowFilters((open) => !open)}
              aria-expanded={showFilters}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Lot status">
          <button
            type="button"
            className={statusPillClass(statusFilter === "all")}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={statusPillClass(statusFilter === "open")}
            onClick={() => setStatusFilter("open")}
          >
            Open
          </button>
          <button
            type="button"
            className={statusPillClass(statusFilter === "closed")}
            onClick={() => setStatusFilter("closed")}
          >
            Closed
          </button>
        </div>

        {showFilters && hasAdvancedFilters ? (
          <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4 shadow-[var(--shadow-card)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {enterpriseOptions.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text-primary">Enterprise</span>
                  <select
                    value={enterpriseFilter}
                    onChange={(e) => setEnterpriseFilter(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary"
                  >
                    <option value="all">All enterprises</option>
                    {enterpriseOptions.map((type) => (
                      <option key={type} value={type}>
                        {ENTERPRISE_LABELS[type as keyof typeof ENTERPRISE_LABELS] ?? type}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {propertyOptions.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text-primary">Property</span>
                  <select
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary"
                  >
                    <option value="all">All properties</option>
                    {propertyOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {locationOptions.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text-primary">Location</span>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary"
                  >
                    <option value="all">All locations</option>
                    {locationOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {ownerOptions.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text-primary">Owner</span>
                  <select
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary"
                  >
                    <option value="all">All owners</option>
                    {ownerOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {sellerOptions.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text-primary">Seller</span>
                  <select
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary"
                  >
                    <option value="all">All sellers</option>
                    {sellerOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-text-primary">Received on or after</span>
                <input
                  type="date"
                  value={receivedAfter}
                  onChange={(e) => setReceivedAfter(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary"
                />
              </label>
            </div>

            {activeFilterCount > 0 ? (
              <div className="mt-3 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border-neutral bg-surface-white px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-navy">{emptyMessage.title}</h2>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">{emptyMessage.body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {search.trim() || activeFilterCount > 0 ? (
              <Button type="button" variant="outline" size="md" onClick={clearFilters}>
                Clear search &amp; filters
              </Button>
            ) : null}
            {emptyMessage.showReceive ? (
              <Link href="/cattle/new">
                <Button size="md">+ Receive Cattle</Button>
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <ul className="space-y-3 pb-2">
          {sorted.map((group) => (
            <li key={group.id}>
              <CattleLotCard group={group} />
            </li>
          ))}
        </ul>
      )}

      <ArchivedToggleSection count={archivedGroups.length} label="archived lots">
        <ul className="space-y-3">
          {archivedGroups.map((group) => (
            <li
              key={group.id}
              className="rounded-[var(--radius-card)] border border-dashed border-border-neutral bg-cream/30 px-4 py-3"
            >
              <p className="font-semibold text-navy">{group.lot_number || group.name}</p>
              <p className="text-sm text-text-secondary">
                {getLotLocationLabel(group)}
                {group.total_head > 0 ? ` · ${group.total_head} hd` : ""}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Archived — hidden from dashboards and active lists
              </p>
            </li>
          ))}
        </ul>
      </ArchivedToggleSection>
    </div>
  );
}
