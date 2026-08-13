"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { OwnerRecord } from "@/lib/owners/types";
import type { OwnerTotalsReport } from "@/lib/reports/owner-totals-types";
import { fetchOwnerTotalsReport } from "@/lib/actions/reports";
import { QuickActionGroup } from "@/components/dashboard/quick-action-group";
import { MiscChargeQuickForm } from "@/components/reports/misc-charge-quick-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface OwnerTotalsReportClientProps {
  orgId: string;
  ownerOptions: OwnerRecord[];
  lotOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; label: string }>;
  initialPeriodStart: string;
  initialPeriodEnd: string;
}

function formatNum(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMoney(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function MetricsCells({ m }: { m: OwnerTotalsReport["totals"] }) {
  return (
    <>
      <td className="px-2 py-2 text-right tabular-nums">{formatNum(m.currentHead)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatNum(m.totalReceived)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatNum(m.totalShipped)}</td>
      <td className="px-2 py-2 text-right tabular-nums text-status-critical">{formatNum(m.deathLoss)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatNum(m.currentInventory)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMoney(m.totalExpenses)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMoney(m.costPerHead)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMoney(m.avgDailyCost)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatNum(m.headDays)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{m.daysOnFeed ?? "—"}</td>
    </>
  );
}

const TABLE_HEAD = (
  <tr className="border-b border-border-neutral text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
    <th className="px-2 py-2">Name</th>
    <th className="px-2 py-2 text-right">Current hd</th>
    <th className="px-2 py-2 text-right">Received</th>
    <th className="px-2 py-2 text-right">Shipped</th>
    <th className="px-2 py-2 text-right">Death loss</th>
    <th className="px-2 py-2 text-right">Inventory</th>
    <th className="px-2 py-2 text-right">Expenses</th>
    <th className="px-2 py-2 text-right">$/hd</th>
    <th className="px-2 py-2 text-right">$/day</th>
    <th className="px-2 py-2 text-right">Head-days</th>
    <th className="px-2 py-2 text-right">Days on feed</th>
  </tr>
);

export function OwnerTotalsReportClient({
  orgId,
  ownerOptions,
  lotOptions,
  locationOptions,
  initialPeriodStart,
  initialPeriodEnd,
}: OwnerTotalsReportClientProps) {
  const [periodStart, setPeriodStart] = useState(initialPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
  const [ownerId, setOwnerId] = useState("");
  const [lotId, setLotId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [lotStatus, setLotStatus] = useState<"active" | "closed" | "all">("active");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<OwnerTotalsReport | null>(null);
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());
  const [showMiscForm, setShowMiscForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  const quickActions = useMemo(() => {
    const qs = new URLSearchParams();
    if (ownerId) qs.set("owner", ownerId);
    if (lotId) qs.set("group", lotId);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return [
      { label: "Add Cattle", href: `/cattle/new${suffix}`, variant: "primary" as const },
      { label: "Move Cattle", href: `/cattle/move${lotId ? `?from=${lotId}` : ""}` },
      {
        label: "Remove Cattle",
        href: `/cattle/move${lotId ? `?from=${lotId}&mode=remove` : "?mode=remove"}`,
      },
      { label: "Record Treatment", href: `/health/treatments/new${lotId ? `?group=${lotId}` : ""}` },
      { label: "Record Feed", href: `/feed/log/new${lotId ? `?group=${lotId}` : ""}` },
      { label: "Record Death Loss", href: lotId ? `/cattle/groups/${lotId}` : "/cow-calf/loss/new" },
      { label: "Ship Cattle", href: `/cow-calf/shipping/new${suffix}` },
      { label: "Sell Cattle", href: `/sales/new${lotId ? `?group=${lotId}` : ""}` },
      { label: "Create Invoice", href: `/invoices/generate${ownerId ? `?owner=${ownerId}` : ""}` },
      {
        label: showMiscForm ? "Hide misc charge" : "Miscellaneous Charge",
        onClick: () => setShowMiscForm((v) => !v),
      },
    ];
  }, [ownerId, lotId, showMiscForm]);

  async function handleLoad() {
    setLoading(true);
    setError(null);
    const result = await fetchOwnerTotalsReport(orgId, {
      periodStart,
      periodEnd,
      ownerId: ownerId || undefined,
      lotId: lotId || undefined,
      locationId: locationId || undefined,
      lotStatus,
      search: search || undefined,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setReport(null);
      return;
    }
    setReport(result.report ?? null);
    setExpandedOwners(new Set());
    setExpandedLots(new Set());
  }

  function toggleOwner(id: string) {
    setExpandedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLot(id: string) {
    setExpandedLots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <QuickActionGroup title="Quick Actions" actions={quickActions} />
      {showMiscForm ? (
        <MiscChargeQuickForm
          orgId={orgId}
          ownerOptions={ownerOptions}
          lotOptions={lotOptions}
          locationOptions={locationOptions}
          defaultOwnerId={ownerId}
          defaultLotId={lotId}
          defaultLocationId={locationId}
          onSaved={() => {
            setShowMiscForm(false);
            if (report) void handleLoad();
          }}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Owner-level inventory and financial totals — drill from owner to lot to location.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="periodStart">Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="periodEnd">End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="ownerFilter">Owner</Label>
              <select
                id="ownerFilter"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className={selectClass}
              >
                <option value="">All owners</option>
                {ownerOptions
                  .filter((o) => !o.is_ownership_group)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor="lotFilter">Lot</Label>
              <select
                id="lotFilter"
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                className={selectClass}
              >
                <option value="">All lots</option>
                {lotOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="locationFilter">Location</Label>
              <select
                id="locationFilter"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className={selectClass}
              >
                <option value="">All locations</option>
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="statusFilter">Lot status</Label>
              <select
                id="statusFilter"
                value={lotStatus}
                onChange={(e) => setLotStatus(e.target.value as "active" | "closed" | "all")}
                className={selectClass}
              >
                <option value="active">Active only</option>
                <option value="closed">Closed only</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="searchOwners">Search owners</Label>
            <Input
              id="searchOwners"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Owner or lot name…"
            />
          </div>
          <Button type="button" onClick={handleLoad} disabled={loading}>
            {loading ? "Loading…" : "Load Owner Totals"}
          </Button>
          {error ? (
            <p className="text-sm text-status-critical" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Card>

      {report ? (
        <>
          {report.warnings.length > 0 ? (
            <ul className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {report.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Ranch total</CardTitle>
              <CardDescription>
                {report.periodStart} through {report.periodEnd} · {report.dayCount} days
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>{TABLE_HEAD}</thead>
                <tbody>
                  <tr className="border-b border-border-neutral bg-cream/40 font-semibold text-navy">
                    <td className="px-2 py-2">All owners</td>
                    <MetricsCells m={report.totals} />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By owner</CardTitle>
              <CardDescription>Click an owner to expand lots, then locations.</CardDescription>
            </CardHeader>
            {report.owners.length === 0 ? (
              <EmptyState title="No owners match" description="Adjust filters and try again." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>{TABLE_HEAD}</thead>
                  <tbody>
                    {report.owners.map((owner) => (
                      <Fragment key={owner.ownerId}>
                        <tr className="border-b border-border-neutral hover:bg-tan/10">
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              className="font-semibold text-navy hover:underline"
                              onClick={() => toggleOwner(owner.ownerId)}
                            >
                              {expandedOwners.has(owner.ownerId) ? "▼" : "▶"} {owner.ownerName}
                            </button>
                            <span className="ml-2 text-xs text-text-secondary">
                              {owner.lotCount} lot{owner.lotCount === 1 ? "" : "s"}
                            </span>
                          </td>
                          <MetricsCells m={owner} />
                        </tr>
                        {expandedOwners.has(owner.ownerId)
                          ? owner.lots.map((lot) => (
                              <Fragment key={`${owner.ownerId}-${lot.lotId}`}>
                                <tr className="border-b border-border-neutral/60 bg-tan/5">
                                  <td className="px-2 py-2 pl-8">
                                    <button
                                      type="button"
                                      className="text-navy hover:underline"
                                      onClick={() => toggleLot(lot.lotId)}
                                    >
                                      {expandedLots.has(lot.lotId) ? "▼" : "▶"}{" "}
                                      <Link
                                        href={`/cattle/groups/${lot.lotId}`}
                                        className="font-medium hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {lot.lotName}
                                      </Link>
                                    </button>
                                    {lot.lotStatus === "closed" ? (
                                      <span className="ml-2 text-xs text-text-secondary">closed</span>
                                    ) : null}
                                  </td>
                                  <MetricsCells m={lot} />
                                </tr>
                                {expandedLots.has(lot.lotId)
                                  ? owner.byLocation
                                      .filter((loc) => loc.lotIds.includes(lot.lotId))
                                      .map((loc) => (
                                        <tr
                                          key={`${lot.lotId}-${loc.locationId ?? "none"}`}
                                          className="border-b border-border-neutral/40 bg-white"
                                        >
                                          <td className="px-2 py-2 pl-14 text-text-secondary">
                                            {loc.locationBreadcrumb ?? loc.locationName}
                                          </td>
                                          <MetricsCells m={loc} />
                                        </tr>
                                      ))
                                  : null}
                              </Fragment>
                            ))
                          : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <EmptyState
          title="Owner Totals"
          description="Set your date range and filters, then load the report."
        />
      )}
    </div>
  );
}
