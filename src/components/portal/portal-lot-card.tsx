import Link from "next/link";
import type { CustomerPortalLot } from "@/lib/portal/customer-dashboard";

export function PortalLotCard({ lot }: { lot: CustomerPortalLot }) {
  const isClosed = lot.status === "closed";
  const isActive = !isClosed && lot.head > 0;

  return (
    <li className="rounded-xl border border-border-neutral bg-surface-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-navy">{lot.label}</p>
          <p className="mt-1 text-sm text-text-secondary">
            {isClosed
              ? "Closed lot"
              : isActive
                ? `${lot.head} head on feed`
                : "Receiving"}
            {lot.location_label ? ` · ${lot.location_label}` : ""}
          </p>
          {!isClosed ? (
            <span className="mt-2 inline-flex rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-medium text-status-info">
              {lot.status_label}
            </span>
          ) : (
            <span className="mt-2 inline-flex rounded-full bg-tan/20 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              Closed
            </span>
          )}
        </div>
        {lot.closeout_token && isClosed ? (
          <Link
            href={`/share/closeout/${lot.closeout_token}`}
            className="rounded-lg border border-border-neutral bg-cream/40 px-3 py-2 text-sm font-semibold text-brown hover:bg-tan/10"
          >
            View closeout report
          </Link>
        ) : null}
      </div>
    </li>
  );
}
