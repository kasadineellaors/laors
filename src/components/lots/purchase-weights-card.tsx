import type { CattleGroupSummary } from "@/lib/inventory/types";
import { perHeadAvg, shrinkPct } from "@/lib/lots/purchase-weights";

function roundLb(n: number) {
  return Math.round(n);
}

interface PurchaseWeightsCardProps {
  group: CattleGroupSummary;
}

export function PurchaseWeightsCard({ group }: PurchaseWeightsCardProps) {
  const head = group.starting_head ?? group.total_head;
  const pay = group.pay_weight_lbs;
  const shrunk = group.shrunk_weight_lbs;
  const received = group.received_weight_lbs;

  if (pay == null && shrunk == null && received == null) {
    return null;
  }

  const payToShrunk = shrinkPct(pay, shrunk);
  const shrunkToReceived = shrinkPct(shrunk, received);
  const payToReceived = shrinkPct(pay, received);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-olive">Purchase weights</p>
      <p className="text-xs text-charcoal/60">Total lot pounds at purchase and arrival</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        {pay != null ? (
          <WeightRow
            label="Pay weight"
            total={pay}
            perHead={perHeadAvg(pay, head)}
          />
        ) : null}
        {shrunk != null ? (
          <WeightRow
            label="Shrunk weight"
            total={shrunk}
            perHead={perHeadAvg(shrunk, head)}
          />
        ) : null}
        {received != null ? (
          <WeightRow
            label="Received weight"
            total={received}
            perHead={perHeadAvg(received, head)}
          />
        ) : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {payToShrunk != null ? (
          <ShrinkBadge label="Pay → shrunk" value={payToShrunk} />
        ) : null}
        {shrunkToReceived != null ? (
          <ShrinkBadge label="Shrunk → received" value={shrunkToReceived} />
        ) : null}
        {payToReceived != null && shrunk == null ? (
          <ShrinkBadge label="Pay → received" value={payToReceived} />
        ) : null}
      </div>
    </div>
  );
}

function WeightRow({
  label,
  total,
  perHead,
}: {
  label: string;
  total: number;
  perHead: number | null;
}) {
  return (
    <div className="rounded-lg bg-cream/60 px-3 py-2">
      <dt className="text-xs text-charcoal/60">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-charcoal">{roundLb(total)} lb</dd>
      {perHead != null ? (
        <dd className="text-xs text-charcoal/60">{roundLb(perHead)} lb / hd</dd>
      ) : null}
    </div>
  );
}

function ShrinkBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-tan-light/50 px-2.5 py-1 font-medium text-charcoal/80">
      {label}: {value.toFixed(1)}%
    </span>
  );
}
