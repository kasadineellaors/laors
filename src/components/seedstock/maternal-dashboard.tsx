"use client";

import Link from "next/link";
import type { MaternalDashboard } from "@/lib/seedstock/maternal/types";
import {
  FERTILITY_TREND_LABELS,
  RETENTION_RECOMMENDATION_LABELS,
} from "@/lib/seedstock/maternal/constants";
import { YearTrendChart } from "@/components/seedstock/year-trend-chart";
import { ExportButtons } from "@/components/export/export-buttons";

interface MaternalDashboardProps {
  orgId: string;
  dashboard: MaternalDashboard;
  canExport?: boolean;
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function DistributionBar({
  buckets,
}: {
  buckets: { label: string; percent: number; count: number }[];
}) {
  const colors = ["bg-navy", "bg-navy/70", "bg-navy/45", "bg-navy/30"];
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-border">
        {buckets.map((b, i) =>
          b.percent > 0 ? (
            <div
              key={b.label}
              className={colors[i] ?? "bg-charcoal/20"}
              style={{ width: `${b.percent}%` }}
              title={`${b.label}: ${b.percent}%`}
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-text-secondary sm:grid-cols-4">
        {buckets.map((b) => (
          <span key={b.label}>
            {b.label}: {b.count} ({b.percent}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    matches: "bg-navy/15 text-brown",
    better_than_expected: "bg-navy/20 text-brown",
    worse_than_expected: "bg-status-critical/15 text-status-critical",
    insufficient_data: "bg-charcoal/10 text-text-secondary",
  };
  const labels: Record<string, string> = {
    matches: "Matches EPD",
    better_than_expected: "Better than expected",
    worse_than_expected: "Worse than expected",
    insufficient_data: "Need more data",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[verdict] ?? styles.insufficient_data}`}>
      {labels[verdict] ?? verdict}
    </span>
  );
}

export function MaternalDashboardView({
  orgId,
  dashboard,
  canExport = false,
}: MaternalDashboardProps) {
  const latestCrop = dashboard.calfCropReports[0];
  const latestDistribution = dashboard.calvingDistribution.byYear[0];

  return (
    <div className="space-y-8">
      {canExport ? (
        <div className="rounded-xl border border-border-neutral bg-surface-white p-4">
          <p className="text-sm font-medium text-navy">Export maternal reports</p>
          <p className="mt-1 text-xs text-text-secondary">CSV or PDF — also available under Setup → Export</p>
          <ul className="mt-3 space-y-3">
            {(
              [
                ["maternal_fertility", "Fertility scores"],
                ["maternal_calf_crop", "Calf crop"],
                ["maternal_calving_ease", "Sire calving ease"],
              ] as const
            ).map(([type, label]) => (
              <li key={type} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-text-primary">{label}</span>
                <ExportButtons orgId={orgId} recordType={type} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <YearTrendChart
          title="First 21-day calving %"
          subtitle="Year-over-year — higher is better"
          points={dashboard.yearTrends.first21DayPercent}
          valueSuffix="%"
          maxValue={100}
        />
        <YearTrendChart
          title="Calf mortality rate"
          subtitle="Year-over-year — lower is better"
          points={dashboard.yearTrends.mortalityRate}
          valueSuffix="%"
          maxValue={100}
        />
        <YearTrendChart
          title="Calves weaned"
          subtitle="By weaning year"
          points={dashboard.yearTrends.calvesWeaned}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Females tracked", value: dashboard.datasetSummary.females },
          { label: "Breeding records", value: dashboard.datasetSummary.breedingRecords },
          { label: "Calving records", value: dashboard.datasetSummary.calvingRecords },
          { label: "Weaning records", value: dashboard.datasetSummary.weaningRecords },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border-neutral bg-surface-white px-3 py-4 text-center">
            <p className="text-2xl font-bold text-brown">{s.value}</p>
            <p className="text-xs text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Top performing females</h2>
          <p className="text-sm text-text-secondary">Ranked by fertility score, lifetime value, and calving consistency</p>
        </div>
        {dashboard.topPerformers.length === 0 ? (
          <p className="text-sm text-text-secondary">Record breeding and calving to generate fertility scores.</p>
        ) : (
          <ul className="space-y-2">
            {dashboard.topPerformers.map((f) => (
              <li key={f.animalId}>
                <Link
                  href={`/seedstock/animals/${f.animalId}`}
                  className="flex items-center justify-between rounded-xl border border-border-neutral bg-surface-white px-4 py-3 hover:border-navy"
                >
                  <div>
                    <p className="font-semibold text-navy">
                      {f.tag}
                      {f.name ? ` — ${f.name}` : ""}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {RETENTION_RECOMMENDATION_LABELS[f.recommendation]} · {FERTILITY_TREND_LABELS[f.trend]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-brown">{f.score}</p>
                    <p className="text-xs text-text-secondary">Top {f.percentile}%</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Underperforming females</h2>
          <p className="text-sm text-text-secondary">Open years, late calving, and low conception</p>
        </div>
        {dashboard.underperformers.length === 0 ? (
          <p className="text-sm text-text-secondary">No flagged females yet.</p>
        ) : (
          <ul className="space-y-2">
            {dashboard.underperformers.map((f) => (
              <li key={f.animalId}>
                <Link
                  href={`/seedstock/animals/${f.animalId}`}
                  className="flex items-center justify-between rounded-xl border border-status-critical/30 bg-surface-white px-4 py-3 hover:border-status-critical"
                >
                  <div>
                    <p className="font-semibold text-navy">{f.tag}</p>
                    <p className="text-xs text-text-secondary">
                      {f.factors.openYears} open year(s) · {f.factors.calvesBorn} calves born
                    </p>
                  </div>
                  <p className="text-xl font-bold text-status-critical">{f.score}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border-neutral bg-surface-white p-4">
        <h2 className="text-lg font-bold text-navy">Maternal lifetime value</h2>
        {dashboard.lifetimeValues.slice(0, 8).map((m) => (
          <div key={m.animalId} className="border-b border-border-neutral py-3 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/seedstock/animals/${m.animalId}`} className="font-semibold text-brown hover:underline">
                {m.tag}
                {m.name ? ` — ${m.name}` : ""}
              </Link>
              <span className="font-bold text-navy">{formatMoney(m.lifetimeValue)}</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {m.calvesBorn} born · {m.calvesWeaned} weaned · {m.daughtersRetained} daughters retained ·{" "}
              {formatMoney(m.offspringRevenue)} offspring revenue
            </p>
          </div>
        ))}
      </section>

      {latestDistribution ? (
        <section className="space-y-3 rounded-xl border border-border-neutral bg-surface-white p-4">
          <h2 className="text-lg font-bold text-navy">Calving distribution — {latestDistribution.year}</h2>
          <p className="text-sm text-text-secondary">First, second, and third 21-day periods of the season</p>
          <DistributionBar buckets={latestDistribution.buckets} />
        </section>
      ) : null}

      {dashboard.calvingDistribution.bySireGroup.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy">By sire group</h2>
          {dashboard.calvingDistribution.bySireGroup.slice(0, 5).map((g) => (
            <div key={`${g.sireKey}-${g.year}`} className="rounded-xl border border-border-neutral bg-surface-white p-4">
              <p className="mb-2 font-medium text-navy">
                {g.sireLabel} <span className="text-text-secondary">({g.year})</span>
              </p>
              <DistributionBar buckets={g.buckets} />
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Calving ease — expected vs actual</h2>
        {dashboard.sireCalvingEase.length === 0 ? (
          <p className="text-sm text-text-secondary">Log calving ease scores to validate sire performance.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border-neutral text-text-secondary">
                  <th className="py-2 pr-3">Sire</th>
                  <th className="py-2 pr-3">Expected</th>
                  <th className="py-2 pr-3">Actual</th>
                  <th className="py-2">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.sireCalvingEase.slice(0, 10).map((s) => (
                  <tr key={s.sireKey} className="border-b border-border/60">
                    <td className="py-3 pr-3 font-medium text-navy">{s.sireLabel}</td>
                    <td className="py-3 pr-3 text-text-secondary">
                      {s.expectedPercentile ?? "—"}
                      {s.epdCalvingEase != null ? ` (${s.epdCalvingEase})` : ""}
                    </td>
                    <td className="py-3 pr-3 text-text-secondary">
                      {s.calvings} calvings · {s.assistedRate}% assisted
                    </td>
                    <td className="py-3">
                      <VerdictBadge verdict={s.verdict} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {latestCrop ? (
        <section className="space-y-3 rounded-xl border border-border-neutral bg-surface-white p-4">
          <h2 className="text-lg font-bold text-navy">Calf crop — {latestCrop.year}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Born", value: latestCrop.calvesBorn },
              { label: "Weaned", value: latestCrop.calvesWeaned },
              { label: "Mortality", value: `${latestCrop.mortalityRate}%` },
              { label: "Replacements", value: latestCrop.replacementHeifers },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-brown">{s.value}</p>
                <p className="text-xs text-text-secondary">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary">
            Losses — calving: {latestCrop.losses.calving_difficulty}, disease: {latestCrop.losses.disease},
            environmental: {latestCrop.losses.environmental}, unknown: {latestCrop.losses.unknown}
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Cow family performance</h2>
        {dashboard.familyProfiles
          .filter((f) => f.daughters.count > 0 || f.sons.count > 0)
          .slice(0, 6)
          .map((f) => (
            <Link
              key={f.damId}
              href={`/seedstock/animals/${f.damId}`}
              className="block rounded-xl border border-border-neutral bg-surface-white p-4 hover:border-navy"
            >
              <p className="font-semibold text-navy">
                {f.damTag}
                {f.damName ? ` — ${f.damName}` : ""}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {f.daughters.count} daughters ({f.daughters.retained} retained) · {f.sons.count} sons ·{" "}
                {formatMoney(f.totalOffspringRevenue)} offspring revenue
              </p>
            </Link>
          ))}
      </section>
    </div>
  );
}
