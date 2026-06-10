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
    <div className="rounded-xl border border-olive/30 bg-olive/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-charcoal">Maternal intelligence</h2>
          <p className="text-xs text-charcoal/60">Reproductive performance at a glance</p>
        </div>
        <Link href="/seedstock/maternal" className="text-xs font-medium text-olive hover:underline">
          Full dashboard →
        </Link>
      </div>

      {fertility ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-charcoal/50">Fertility score</dt>
            <dd className="text-2xl font-bold text-olive">{fertility.score}</dd>
          </div>
          <div>
            <dt className="text-charcoal/50">Herd percentile</dt>
            <dd className="font-semibold text-charcoal">Top {fertility.percentile}%</dd>
          </div>
          <div>
            <dt className="text-charcoal/50">Trend</dt>
            <dd className="font-medium text-charcoal">{FERTILITY_TREND_LABELS[fertility.trend]}</dd>
          </div>
          <div>
            <dt className="text-charcoal/50">Recommendation</dt>
            <dd className="font-medium text-charcoal">
              {RETENTION_RECOMMENDATION_LABELS[fertility.recommendation]}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-charcoal/50">Reproductive summary</dt>
            <dd className="text-charcoal/80">
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
        <div className="mt-4 border-t border-olive/20 pt-4">
          <p className="text-xs text-charcoal/50">Maternal lifetime value</p>
          <p className="text-xl font-bold text-charcoal">
            {lifetime.lifetimeValue.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="mt-1 text-xs text-charcoal/60">
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
