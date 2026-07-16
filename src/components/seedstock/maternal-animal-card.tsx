import Link from "next/link";
import type { FertilityScoreResult, MaternalLifetimeValue } from "@/lib/seedstock/maternal/types";
import {
  FERTILITY_TREND_LABELS,
  RETENTION_RECOMMENDATION_LABELS,
} from "@/lib/seedstock/maternal/constants";

interface MaternalAnimalCardProps {
  fertility: FertilityScoreResult | null;
  lifetime: MaternalLifetimeValue | null;
}

export function MaternalAnimalCard({ fertility, lifetime }: MaternalAnimalCardProps) {
  if (!fertility && !lifetime) return null;

  return (
    <div className="rounded-xl border border-navy/30 bg-navy/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-navy">Maternal intelligence</h2>
          <p className="text-xs text-text-secondary">Reproductive performance at a glance</p>
        </div>
        <Link href="/seedstock/maternal" className="text-xs font-medium text-brown hover:underline">
          Full dashboard →
        </Link>
      </div>

      {fertility ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-text-secondary">Fertility score</dt>
            <dd className="text-2xl font-bold text-brown">{fertility.score}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Herd percentile</dt>
            <dd className="font-semibold text-navy">Top {fertility.percentile}%</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Trend</dt>
            <dd className="font-medium text-navy">{FERTILITY_TREND_LABELS[fertility.trend]}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Recommendation</dt>
            <dd className="font-medium text-navy">
              {RETENTION_RECOMMENDATION_LABELS[fertility.recommendation]}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-text-secondary">Reproductive summary</dt>
            <dd className="text-text-primary/80">
              {fertility.factors.calvesBorn} calves born · {fertility.factors.calvesWeaned} weaned ·{" "}
              {fertility.factors.openYears} open year(s)
              {fertility.factors.avgCalvingIntervalDays != null
                ? ` · ${Math.round(fertility.factors.avgCalvingIntervalDays)}-day avg interval`
                : ""}
            </dd>
          </div>
        </dl>
      ) : null}

      {lifetime ? (
        <div className="mt-4 border-t border-navy/20 pt-4">
          <p className="text-xs text-text-secondary">Maternal lifetime value</p>
          <p className="text-xl font-bold text-navy">
            {lifetime.lifetimeValue.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {lifetime.daughtersRetained} daughters retained ·{" "}
            {lifetime.offspringRevenue.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}{" "}
            offspring revenue
          </p>
        </div>
      ) : null}
    </div>
  );
}
