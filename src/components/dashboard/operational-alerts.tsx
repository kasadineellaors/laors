import Link from "next/link";
import type { AttentionLot, LowFeedAlert } from "@/lib/dashboard/queries";
import { Button } from "@/components/ui/button";

interface OperationalAlertsProps {
  attentionLots: AttentionLot[];
  lowFeedItems: LowFeedAlert[];
}

export function OperationalAlerts({ attentionLots, lowFeedItems }: OperationalAlertsProps) {
  if (attentionLots.length === 0 && lowFeedItems.length === 0) return null;

  return (
    <div className="space-y-4">
      {attentionLots.length > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-bold text-navy">Lots Needing Attention</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Receiving, hospital, ready to sell, or partially sold
          </p>
          <ul className="mt-3 divide-y divide-border-neutral">
            {attentionLots.map((lot) => (
              <li key={lot.id}>
                <Link
                  href={`/cattle/groups/${lot.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-brown"
                >
                  <div>
                    <p className="font-semibold text-text-primary">{lot.label}</p>
                    <p className="text-sm text-text-secondary">
                      {lot.status_label}
                      {lot.location ? ` · ${lot.location}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-navy">{lot.head} hd</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lowFeedItems.length > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-status-warning/30 bg-status-warning-bg p-5">
          <h2 className="text-lg font-bold text-navy">Low Feedstock</h2>
          <p className="mt-0.5 text-sm text-text-secondary">Below reorder level</p>
          <ul className="mt-3 space-y-2">
            {lowFeedItems.map((item) => (
              <li
                key={item.id}
                className="flex justify-between rounded-lg bg-surface-white px-3 py-2 text-sm"
              >
                <span className="font-medium text-text-primary">{item.name}</span>
                <span className="font-semibold text-status-warning">
                  {item.quantity_on_hand} {item.unit}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link href="/feed/inventory">
              <Button variant="outline" size="sm" fullWidth>
                Feed inventory
              </Button>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
