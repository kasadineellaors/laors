import Link from "next/link";
import { EnterpriseBadge } from "@/components/enterprise/enterprise-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";

interface RanchEnterpriseHubProps {
  stocker?: {
    activeLots: number;
    headOnFeed: number;
    attentionLots: number;
    openInvoices?: number;
  };
  cowCalf?: {
    herdCount: number;
    pairs: number;
    calvesAtSide: number;
    calvesThisMonth: number;
  };
}

export function RanchEnterpriseHub({ stocker, cowCalf }: RanchEnterpriseHubProps) {
  if (!stocker && !cowCalf) return null;

  return (
    <section className="space-y-4" aria-label="Enterprise overview">
      <SectionHeader
        title="Enterprise overview"
        description="Separate summaries for each operation — metrics are not combined."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {stocker ? (
          <article className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <EnterpriseBadge enterprise="stocker" />
              <Link href="/cattle">
                <Button variant="outline" size="sm">
                  Stocker overview
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Active lots" value={String(stocker.activeLots)} />
              <MetricCard label="Head on feed" value={stocker.headOnFeed.toLocaleString()} />
              <MetricCard
                label="Lots needing attention"
                value={String(stocker.attentionLots)}
                tone={stocker.attentionLots > 0 ? "warning" : "default"}
              />
              {stocker.openInvoices != null ? (
                <MetricCard
                  label="Open invoices"
                  value={String(stocker.openInvoices)}
                  tone={stocker.openInvoices > 0 ? "warning" : "default"}
                />
              ) : null}
            </div>
          </article>
        ) : null}

        {cowCalf ? (
          <article className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <EnterpriseBadge enterprise="cow_calf" />
              <Link href="/cow-calf">
                <Button variant="outline" size="sm">
                  Cow-Calf overview
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Active herds" value={String(cowCalf.herdCount)} centered />
              <MetricCard label="Cow-calf pairs" value={String(cowCalf.pairs)} centered />
              <MetricCard label="Calves at side" value={String(cowCalf.calvesAtSide)} centered />
              <MetricCard
                label="Calves this month"
                value={String(cowCalf.calvesThisMonth)}
                centered
              />
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
