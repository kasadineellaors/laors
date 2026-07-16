import Link from "next/link";
import type { ReactNode } from "react";
import type { CowCalfReportSnapshot } from "@/lib/cow-calf/report-types";
import { formatLbs, formatPct } from "@/lib/cow-calf/report-metrics";
import { ForemanSummaryPanel } from "@/components/cow-calf/foreman-summary-panel";
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
  return (
    <div className="rounded-xl border border-border-neutral bg-surface-white px-3 py-4 text-center">
      <p className="text-2xl font-bold text-brown">{value}</p>
      <p className="text-xs font-medium text-navy">{label}</p>
      {context ? <p className="mt-1 text-xs text-text-secondary">{context}</p> : null}
    </div>
  );
}

function Section({
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
      <div>
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function CowCalfReportsView({ report }: { report: CowCalfReportSnapshot }) {
  const year = new Date().getFullYear();

  return (
    <div className="space-y-8">
      <Section title="Inventory" description="Current cow-calf head and pairs (individual + group herds).">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Cow-calf pairs" value={report.inventory.pairs.toString()} />
          <StatCard label="Cows & heifers" value={report.inventory.cows.toString()} />
          <StatCard label="Calves at side" value={report.inventory.calvesAtSide.toString()} />
          <StatCard label="Active herds" value={report.inventory.herdCount.toString()} />
        </div>
      </Section>

      <Section
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
      </Section>

      <Section title={`Calving ${year}`} description="Cow-calf calving records only.">
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
      </Section>

      <Section title={`Weaning & exits`} description={`${year} weaning and last 30 days of sales/loss.`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="YTD weaned" value={report.weaning.yearToDate.toString()} />
          <StatCard
            label="Avg weaning wt"
            value={formatLbs(report.weaning.avgWeaningWeightLbs)}
          />
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
      </Section>

      <Section
        title="Data quality & foreman"
        description="Rule-based checks — review before breeding season or weaning."
      >
        <ForemanSummaryPanel items={report.dataQuality} />
      </Section>

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
