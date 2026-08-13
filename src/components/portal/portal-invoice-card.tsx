import type { CustomerPortalInvoice } from "@/lib/portal/customer-dashboard";
import { formatPortalMoney } from "@/lib/portal/customer-dashboard";
import {
  categoryLabel,
  describeInvoiceLine,
  formatBillingPeriodLabel,
  formatHeadDays,
  formatMoney,
  formatTons,
  parseBillingPeriod,
} from "@/lib/invoices/format-billing";

const STATUS: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-tan/20 text-text-secondary",
  },
  sent: {
    label: "Due",
    className: "bg-status-warning-bg text-status-warning",
  },
  paid: {
    label: "Paid",
    className: "bg-status-info-bg text-status-info",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-tan/20 text-text-secondary",
  },
};

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PortalInvoiceCard({ invoice }: { invoice: CustomerPortalInvoice }) {
  const status = STATUS[invoice.status] ?? {
    label: invoice.status,
    className: "bg-tan/20 text-text-secondary",
  };
  const period = parseBillingPeriod(invoice.notes);
  const snapshot = invoice.billing_snapshot;

  return (
    <li className="rounded-xl border border-border-neutral bg-surface-white overflow-hidden">
      <div className="border-b border-border-neutral bg-cream/30 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-navy">{invoice.invoice_number}</p>
            <p className="text-sm text-text-secondary">Issued {formatDate(invoice.invoice_date)}</p>
            {period ? (
              <p className="mt-1 text-sm font-medium text-navy/80">
                For {formatBillingPeriodLabel(period.start, period.end)}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums text-brown">
              {formatPortalMoney(invoice.subtotal)}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {snapshot ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {snapshot.yardageHeadDays > 0 ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-text-secondary">
                Yardage: {formatHeadDays(snapshot.yardageHeadDays)} head-days
              </span>
            ) : null}
            {snapshot.pastureHeadDays > 0 ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-text-secondary">
                Pasture: {formatHeadDays(snapshot.pastureHeadDays)} head-days
              </span>
            ) : null}
            {snapshot.feedSummary ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-text-secondary">
                Feed:{" "}
                {snapshot.feedSummary.totalTons > 0
                  ? `${formatTons(snapshot.feedSummary.totalTons)} tons`
                  : snapshot.feedSummary.totalCost != null
                    ? formatMoney(snapshot.feedSummary.totalCost)
                    : `${snapshot.feedSummary.deliveryCount} deliveries`}
                {(snapshot.feedSummary.rations?.length ?? 0) > 0
                  ? ` · ${snapshot.feedSummary.rations!.map((r) => r.rationName).join(", ")}`
                  : ""}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {invoice.lines.length > 0 ? (
        <ul className="divide-y divide-border-neutral px-4 py-2">
          {invoice.lines.map((line, i) => {
            const isDead = line.category === "dead";
            return (
              <li key={i} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy">
                    {line.category ? categoryLabel(line.category) : "Charge"}
                  </p>
                  <p className="text-text-secondary">{describeInvoiceLine(line)}</p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-text-primary">
                  {isDead ? "—" : formatMoney(line.line_total)}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-text-secondary">
          Line details are not available for this invoice.
        </p>
      )}

      {invoice.status === "sent" ? (
        <p className="border-t border-border-neutral bg-cream/20 px-4 py-3 text-xs text-text-secondary">
          Contact the ranch to arrange payment for this invoice.
        </p>
      ) : null}
    </li>
  );
}
