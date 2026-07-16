"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TreatmentRecord } from "@/lib/health/types";
import { TREATMENT_REASONS, TREATMENT_TYPES, treatmentTypeLabel } from "@/lib/health/constants";
import {
  formatDoseLine,
  formatShortDate,
  formatWithdrawalStatus,
} from "@/lib/health/display";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface TreatmentListProps {
  treatments: TreatmentRecord[];
  emptyMessage?: string;
}

function reasonDisplay(reason: string | null): string | null {
  if (!reason?.trim()) return null;
  const match = TREATMENT_REASONS.find(
    (r) => r.value.toLowerCase() === reason.trim().toLowerCase(),
  );
  return match?.label ?? reason;
}

function StatusChip({
  label,
  variant,
}: {
  label: string;
  variant: "warning" | "critical" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "warning" && "bg-status-warning-bg text-status-warning",
        variant === "critical" && "bg-status-critical-bg text-status-critical",
        variant === "neutral" && "bg-tan/50 text-text-secondary",
      )}
    >
      {label}
    </span>
  );
}

export function TreatmentList({ treatments, emptyMessage }: TreatmentListProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [withdrawalFilter, setWithdrawalFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const productOptions = useMemo(() => {
    return [...new Set(treatments.map((t) => t.product_name))].sort();
  }, [treatments]);

  const groupOptions = useMemo(() => {
    return [
      ...new Set(
        treatments.map((t) => t.cattle_group_name).filter((n): n is string => Boolean(n)),
      ),
    ].sort();
  }, [treatments]);

  const locationOptions = useMemo(() => {
    return [
      ...new Set(
        treatments.map((t) => t.location_label).filter((n): n is string => Boolean(n)),
      ),
    ].sort();
  }, [treatments]);

  const adminOptions = useMemo(() => {
    return [
      ...new Set(
        treatments.map((t) => t.administered_by_name).filter((n): n is string => Boolean(n)),
      ),
    ].sort();
  }, [treatments]);

  const hasAdvancedFilters =
    productOptions.length > 1 ||
    groupOptions.length > 1 ||
    locationOptions.length > 1 ||
    adminOptions.length > 1;

  const activeFilterCount = [
    dateFrom !== "",
    dateTo !== "",
    productFilter !== "all",
    typeFilter !== "all",
    reasonFilter !== "all",
    groupFilter !== "all",
    locationFilter !== "all",
    adminFilter !== "all",
    withdrawalFilter !== "all",
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return treatments.filter((t) => {
      if (dateFrom && t.treatment_date < dateFrom) return false;
      if (dateTo && t.treatment_date > dateTo) return false;
      if (productFilter !== "all" && t.product_name !== productFilter) return false;
      if (typeFilter !== "all" && t.treatment_type !== typeFilter) return false;
      if (reasonFilter !== "all") {
        const display = reasonDisplay(t.reason);
        if (display?.toLowerCase() !== reasonFilter.toLowerCase()) return false;
      }
      if (groupFilter !== "all" && t.cattle_group_name !== groupFilter) return false;
      if (locationFilter !== "all" && t.location_label !== locationFilter) return false;
      if (adminFilter !== "all" && t.administered_by_name !== adminFilter) return false;
      if (withdrawalFilter === "active" && !t.withdrawal_active) return false;
      if (withdrawalFilter === "none" && t.withdrawal_active) return false;
      if (!q) return true;
      const haystack = [
        t.product_name,
        t.reason,
        t.notes,
        t.cattle_group_name,
        t.location_label,
        t.administered_by_name,
        treatmentTypeLabel(t.treatment_type),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    treatments,
    search,
    dateFrom,
    dateTo,
    productFilter,
    typeFilter,
    reasonFilter,
    groupFilter,
    locationFilter,
    adminFilter,
    withdrawalFilter,
  ]);

  const selectClass =
    "flex h-11 min-h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-3 text-sm text-text-primary";

  if (treatments.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-border-neutral px-4 py-10 text-center text-sm text-text-secondary">
        {emptyMessage ?? "No treatments logged yet."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Input
          type="search"
          placeholder="Search treatments, products, groups…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search treatments"
        />
        {hasAdvancedFilters ? (
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="text-sm font-medium text-brown hover:underline"
          >
            {showFilters ? "Hide filters" : "Show filters"}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        ) : null}
        {showFilters ? (
          <div className="grid gap-3 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="date-from" className="mb-1 block text-xs font-medium text-text-secondary">
                From date
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={selectClass}
              />
            </div>
            <div>
              <label htmlFor="date-to" className="mb-1 block text-xs font-medium text-text-secondary">
                To date
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={selectClass}
              />
            </div>
            {productOptions.length > 1 ? (
              <div>
                <label htmlFor="product-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                  Product
                </label>
                <select
                  id="product-filter"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All products</option>
                  {productOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label htmlFor="type-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                Treatment type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All types</option>
                {TREATMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reason-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                Reason
              </label>
              <select
                id="reason-filter"
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All reasons</option>
                {TREATMENT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {groupOptions.length > 1 ? (
              <div>
                <label htmlFor="group-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                  Cattle group
                </label>
                <select
                  id="group-filter"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All groups</option>
                  {groupOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {locationOptions.length > 1 ? (
              <div>
                <label htmlFor="location-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                  Location
                </label>
                <select
                  id="location-filter"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All locations</option>
                  {locationOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {adminOptions.length > 1 ? (
              <div>
                <label htmlFor="admin-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                  Administered by
                </label>
                <select
                  id="admin-filter"
                  value={adminFilter}
                  onChange={(e) => setAdminFilter(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All staff</option>
                  {adminOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label htmlFor="withdrawal-filter" className="mb-1 block text-xs font-medium text-text-secondary">
                Withdrawal
              </label>
              <select
                id="withdrawal-filter"
                value={withdrawalFilter}
                onChange={(e) => setWithdrawalFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All</option>
                <option value="active">Active withdrawal</option>
                <option value="none">No active withdrawal</option>
              </select>
            </div>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No treatments match your filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => {
            const reason = reasonDisplay(t.reason);
            const typeLabel = treatmentTypeLabel(t.treatment_type);
            const secondary = reason ?? typeLabel;
            const doseLine = formatDoseLine(t.quantity_used, t.head_count, t.medicine_unit);
            const withdrawal = formatWithdrawalStatus(t.withdrawal_until);
            const cattleParts: string[] = [];
            if (t.cattle_group_name) cattleParts.push(t.cattle_group_name);
            if (t.head_count != null) cattleParts.push(`${t.head_count} head`);

            return (
              <li key={t.id}>
                <Link
                  href={`/health/treatments/${t.id}`}
                  className={cn(
                    "group block rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4 shadow-[var(--shadow-card)] transition-all",
                    "hover:border-navy/25 hover:shadow-[0_4px_12px_rgba(39,66,93,0.12)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
                    "cursor-pointer",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-navy">{t.product_name}</p>
                        {withdrawal?.active ? (
                          <StatusChip label="Active withdrawal" variant="warning" />
                        ) : null}
                      </div>
                      {secondary ? (
                        <p className="mt-0.5 text-sm text-text-secondary">{secondary}</p>
                      ) : null}
                    </div>
                    <span
                      className="shrink-0 text-lg text-text-secondary transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    >
                      ›
                    </span>
                  </div>

                  {cattleParts.length > 0 ? (
                    <p className="mt-2 text-sm font-medium text-text-primary">
                      {cattleParts.join(" · ")}
                    </p>
                  ) : null}

                  {t.location_label ? (
                    <p className="mt-0.5 text-sm text-text-secondary">{t.location_label}</p>
                  ) : null}

                  <div className="mt-2 space-y-1 text-sm text-text-secondary">
                    {doseLine ? <p>{doseLine}</p> : null}
                    {t.administered_by_name ? (
                      <p>Administered by {t.administered_by_name}</p>
                    ) : null}
                    {withdrawal ? (
                      <p className={withdrawal.active ? "font-medium text-status-warning" : undefined}>
                        {withdrawal.label}
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm font-medium text-text-primary">
                    {formatShortDate(t.treatment_date)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
