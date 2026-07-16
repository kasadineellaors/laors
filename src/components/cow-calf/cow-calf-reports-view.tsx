import Link from "next/link";
import type { ReactNode } from "react";
import type { CowCalfReportSnapshot } from "@/lib/cow-calf/report-types";
import { formatLbs, formatPct } from "@/lib/cow-calf/report-metrics";
import { ForemanSummaryPanel } from "@/components/cow-calf/foreman-summary-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({
  label,
  value,
  context,
}: {
  label: string;
  value: string;
  context?: string;
}) {
  return <MetricCard label={label} value={value} context={context} centered className="min-h-0" />;
}

function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  );
}

export function CowCalfReportsView({ report }: { report: CowCalfReportSnapshot }) {
  const year = new Date().getFullYear();

  return (
    <div className="space-y-8">
      <ReportSection
        title="Inventory"
        description="Current cow-calf head and pairs (individual + group herds)."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Cow-calf pairs" value={report.inventory.pairs.toString()} />
          <StatCard label="Cows & heifers" value={report.inventory.cows.toString()} />
          <StatCard label="Calves at side" value={report.inventory.calvesAtSide.toString()} />
          <StatCard label="Active herds" value={report.inventory.herdCount.toString()} />
        </div>
      </ReportSection>

      <ReportSection
        title="Reproduction"
        description="Breeding program status — separate from stocker lot records."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Pregnancy rate"
            value={formatPct(report.reproduction.pregnancyRatePct)}
            context={
              report.reproduction.checkedFemales > 0
                ? `${report.reproduction.checkedFemales} checked`
                : "No checks yet"
            }
          />
          <StatCard
            label="Confirmed / bred"
            value={(
              report.reproduction.summary.confirmed + report.reproduction.summary.activeBred
            ).toString()}
          />
          <StatCard label="Open" value={report.reproduction.summary.open.toString()} />
          <StatCard
            label="Due in 30 days"
            value={report.reproduction.summary.dueNext30Days.toString()}
          />
        </div>
        <p className="text-xs text-text-secondary">{report.reproduction.pregnancyRateLabel}</p>
        <Link href="/cow-calf/breeding" className="text-sm font-medium text-brown hover:underline">
          Open breeding hub →
        </Link>
      </ReportSection>

      <ReportSection title={`Calving ${year}`} description="Cow-calf calving records only.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="YTD calvings" value={report.calving.yearToDate.toString()} />
          <StatCard
            label="Live calving %"
            value={formatPct(report.calving.yearToDateLiveRatePct)}
            context={`${report.calving.yearToDateLive} live`}
          />
          <StatCard label="This month" value={report.calving.thisMonth.toString()} />
          <StatCard
            label="Not birth-processed"
            value={report.unprocessedCalves.toString()}
            context="Calves at side"
          />
        </div>
        <Link href="/cow-calf/calving" className="text-sm font-medium text-brown hover:underline">
          Calving records →
        </Link>
      </ReportSection>

      <ReportSection
        title="Weaning & exits"
        description={`${year} weaning and last 30 days of sales/loss.`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="YTD weaned" value={report.weaning.yearToDate.toString()} />
          <StatCard label="Avg weaning wt" value={formatLbs(report.weaning.avgWeaningWeightLbs)} />
          <StatCard
            label="Ready to wean"
            value={report.weaning.calvesReadyToWean.toString()}
          />
          <StatCard
            label="Head sold (30d)"
            value={report.exits.headSoldLast30Days.toString()}
            context={`${report.exits.lossesLast30Days} losses`}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/cow-calf/weaning" className="font-medium text-brown hover:underline">
            Weaning →
          </Link>
          <Link href="/cow-calf/sales" className="font-medium text-brown hover:underline">
            Cow-calf sales →
          </Link>
          <Link href="/cow-calf/loss" className="font-medium text-brown hover:underline">
            Death & loss →
          </Link>
        </div>
      </ReportSection>

      <ReportSection
        title="Inventory by herd"
        description="Current head count per active cow-calf herd."
      >
        {report.herdBreakdown.length === 0 ? (
          <p className="text-sm text-text-secondary">No active herds yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-neutral">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-3 py-2">Herd</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2 text-right">Pairs</th>
                  <th className="px-3 py-2 text-right">Cows</th>
                  <th className="px-3 py-2 text-right">Calves</th>
                  <th className="px-3 py-2 text-right">Bulls</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-neutral bg-surface-white">
                {report.herdBreakdown.map((row) => (
                  <tr key={row.herdId}>
                    <td className="px-3 py-2 font-medium text-navy">
                      <Link href={`/cow-calf/herds/${row.herdId}`} className="hover:underline">
                        {row.herdName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{row.locationName ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{row.pairs}</td>
                    <td className="px-3 py-2 text-right">{row.cows}</td>
                    <td className="px-3 py-2 text-right">{row.calvesAtSide}</td>
                    <td className="px-3 py-2 text-right">{row.bulls}</td>
                    <td className="px-3 py-2 text-right font-medium">{row.totalPhysicalHead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection
        title="Data quality & foreman"
        description="Rule-based checks — review before breeding season or weaning."
      >
        <ForemanSummaryPanel items={report.dataQuality} />
      </ReportSection>

      <Card>
        <CardHeader>
          <CardTitle>Stocker & ranch P&amp;L</CardTitle>
          <CardDescription>
            Lot closeouts and enterprise P&amp;L are unchanged — cow-calf reports do not mix with
            stocker billing.
          </CardDescription>
        </CardHeader>
        <Link href="/reports" className="block px-4 pb-4 text-sm font-medium text-brown hover:underline">
          Ranch-wide reports →
        </Link>
      </Card>
    </div>
  );
}
