"use client";

import { useMemo, useState } from "react";
import type { OwnerRecord } from "@/lib/owners/types";
import type { HeadDaysReport } from "@/lib/reports/head-days";
import { fetchHeadDaysReport } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HeadDaysReportClientProps {
  orgId: string;
  ownerOptions: OwnerRecord[];
  initialPeriodStart: string;
  initialPeriodEnd: string;
}

type ViewMode = "lot" | "pen" | "pasture";

function formatNum(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function HeadDaysReportClient({
  orgId,
  ownerOptions,
  initialPeriodStart,
  initialPeriodEnd,
}: HeadDaysReportClientProps) {
  const [periodStart, setPeriodStart] = useState(initialPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
  const [ownerId, setOwnerId] = useState("");
  const [view, setView] = useState<ViewMode>("lot");
  const [report, setReport] = useState<HeadDaysReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  const pasturePens = useMemo(
    () => report?.byPen.filter((p) => p.billingMode === "pasture") ?? [],
    [report],
  );
  const yardagePens = useMemo(
    () => report?.byPen.filter((p) => p.billingMode === "yardage") ?? [],
    [report],
  );

  async function handleLoad() {
    setLoading(true);
    setError(null);
    const result = await fetchHeadDaysReport(orgId, {
      periodStart,
      periodEnd,
      ownerId: ownerId || undefined,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setReport(null);
      return;
    }
    setReport(result.report ?? null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Period</CardTitle>
          <CardDescription>
            Move-aware head-days from inventory, moves, sales, and calvings.
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
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setReport(null);
                }}
              />
            </div>
            <div>
              <Label htmlFor="periodEnd">End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  setReport(null);
                }}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ownerFilter">Owner (optional)</Label>
            <select
              id="ownerFilter"
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value);
                setReport(null);
              }}
              className={selectClass}
            >
              <option value="">All lots — ranch-wide</option>
              {ownerOptions
                .filter((o) => !o.is_ownership_group)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
          </div>
          <Button type="button" fullWidth onClick={handleLoad} disabled={loading}>
            {loading ? "Calculating…" : "Load head-days"}
          </Button>
        </div>
      </Card>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      {report ? (
        <Card>
          <CardHeader>
            <CardTitle>Head-days summary</CardTitle>
            <CardDescription>
              {formatNum(report.totalHeadDays)} total · {report.dayCount} days · avg{" "}
              {formatNum(report.avgHead)} head
            </CardDescription>
          </CardHeader>
          <dl className="mb-4 grid grid-cols-2 gap-3 px-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-text-secondary">Pasture head-days</dt>
              <dd className="font-semibold tabular-nums text-navy">
                {formatNum(report.pastureHeadDays)}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Yardage head-days</dt>
              <dd className="font-semibold tabular-nums text-navy">
                {formatNum(report.yardageHeadDays)}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Lots</dt>
              <dd className="font-semibold tabular-nums text-navy">{report.lots.length}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Pens</dt>
              <dd className="font-semibold tabular-nums text-navy">{report.byPen.length}</dd>
            </div>
          </dl>

          {report.warnings.length > 0 ? (
            <ul className="mb-4 space-y-1 rounded-lg bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
              {report.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          <div className="mb-4 flex flex-wrap gap-2 px-4">
            {(
              [
                ["lot", "By lot"],
                ["pen", "By pen"],
                ["pasture", "Pasture vs yardage"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={view === id ? "primary" : "outline"}
                onClick={() => setView(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          {view === "lot" ? (
            <HeadDaysTable
              headers={["Lot", "Owner", "Pen", "Type", "Avg head", "Head-days"]}
              rows={report.lots.map((row) => [
                row.ownerShare < 1
                  ? `${row.groupName} (${Math.round(row.ownerShare * 100)}%)`
                  : row.groupName,
                row.ownerName ?? "—",
                row.locationBreadcrumb ?? row.locationName ?? "—",
                row.billingMode,
                formatNum(row.avgHead),
                formatNum(row.headDays),
              ])}
            />
          ) : null}

          {view === "pen" ? (
            <HeadDaysTable
              headers={["Pen", "Type", "Lots", "Avg head", "Head-days"]}
              rows={report.byPen.map((row) => [
                row.locationBreadcrumb ?? row.locationName,
                row.billingMode,
                String(row.lotCount),
                formatNum(row.avgHead),
                formatNum(row.headDays),
              ])}
            />
          ) : null}

          {view === "pasture" ? (
            <div className="space-y-4 px-4 pb-4">
              <section>
                <h3 className="text-sm font-semibold text-navy">
                  Pasture ({formatNum(report.pastureHeadDays)} head-days)
                </h3>
                {pasturePens.length === 0 ? (
                  <p className="mt-1 text-sm text-text-secondary">No pasture head-days in period.</p>
                ) : (
                  <HeadDaysTable
                    className="mt-2"
                    headers={["Pen", "Lots", "Avg head", "Head-days"]}
                    rows={pasturePens.map((row) => [
                      row.locationBreadcrumb ?? row.locationName,
                      String(row.lotCount),
                      formatNum(row.avgHead),
                      formatNum(row.headDays),
                    ])}
                  />
                )}
              </section>
              <section>
                <h3 className="text-sm font-semibold text-navy">
                  Yardage ({formatNum(report.yardageHeadDays)} head-days)
                </h3>
                {yardagePens.length === 0 ? (
                  <p className="mt-1 text-sm text-text-secondary">No yardage head-days in period.</p>
                ) : (
                  <HeadDaysTable
                    className="mt-2"
                    headers={["Pen", "Lots", "Avg head", "Head-days"]}
                    rows={yardagePens.map((row) => [
                      row.locationBreadcrumb ?? row.locationName,
                      String(row.lotCount),
                      formatNum(row.avgHead),
                      formatNum(row.headDays),
                    ])}
                  />
                )}
              </section>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function HeadDaysTable({
  headers,
  rows,
  className,
}: {
  headers: string[];
  rows: string[][];
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className={`px-4 pb-4 text-sm text-text-secondary ${className ?? ""}`}>
        No data for this period.
      </p>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-lg border border-border-neutral ${className ?? "mx-4 mb-4"}`}>
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b border-border-neutral bg-tan/20 text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={`px-3 py-2 font-medium ${h === "Head-days" || h === "Avg head" ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border-neutral/60 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 ${j === 0 ? "font-medium text-navy" : "text-text-secondary"} ${
                    j >= row.length - 2 && j === row.length - 1
                      ? "text-right tabular-nums text-navy"
                      : j === row.length - 2 && headers[j] === "Avg head"
                        ? "text-right tabular-nums"
                        : ""
                  } ${j === row.length - 1 ? "text-right tabular-nums font-medium text-navy" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
