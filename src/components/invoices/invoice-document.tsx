import type { InvoicePrintData } from "@/lib/invoices/print-types";
import { formatOrgAddress } from "@/lib/invoices/print-types";
import {
  categoryLabel,
  describeInvoiceLine,
  formatBillingPeriodLabel,
  formatHeadDays,
  formatMoney,
  formatTons,
  parseBillingPeriod,
} from "@/lib/invoices/format-billing";

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatQty(line: {
  quantity: number;
  unit_price: number;
  category: string | null;
}): string {
  if (line.category === "yardage" || line.category === "pasture") {
    return `${formatHeadDays(line.quantity)} hd-days`;
  }
  if (line.category === "feed" && line.quantity < 1000) {
    return `${formatTons(line.quantity)} tons`;
  }
  if (line.quantity === 1) return "1";
  return formatHeadDays(line.quantity);
}

function formatUnitPrice(line: {
  quantity: number;
  unit_price: number;
  category: string | null;
}): string {
  if (line.category === "dead") return "—";
  if (line.category === "yardage" || line.category === "pasture") {
    return `${formatMoney(line.unit_price)}/day`;
  }
  if (line.category === "feed" && line.quantity < 1000) {
    return `${formatMoney(line.unit_price)}/ton`;
  }
  return formatMoney(line.unit_price);
}

export function InvoiceDocument({ invoice, org }: InvoicePrintData) {
  const orgAddress = formatOrgAddress(org);
  const period = parseBillingPeriod(invoice.notes);
  const snapshot = invoice.billing_snapshot;

  return (
    <div className="invoice-document rounded-xl border border-border-neutral bg-white px-6 py-8 text-text-primary shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div>
          <p className="text-lg font-bold text-brown">{org.name}</p>
          {orgAddress ? (
            <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{orgAddress}</p>
          ) : null}
          {org.phone ? <p className="mt-1 text-sm text-text-secondary">{org.phone}</p> : null}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold tracking-wide text-text-primary">INVOICE</p>
          <p className="mt-1 text-sm font-semibold text-navy/80">{invoice.invoice_number}</p>
          <p className="mt-2 text-sm text-text-secondary">Date: {formatDate(invoice.invoice_date)}</p>
          {invoice.due_date ? (
            <p className="text-sm text-text-secondary">Due: {formatDate(invoice.due_date)}</p>
          ) : null}
          {period ? (
            <p className="mt-1 text-sm font-medium text-navy">
              Billing period: {formatBillingPeriodLabel(period.start, period.end)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 border-t border-border-neutral pt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Bill to</p>
        <p className="mt-2 text-lg font-semibold text-navy">{invoice.customer_name}</p>
        {invoice.customer_email ? (
          <p className="text-sm text-text-secondary">{invoice.customer_email}</p>
        ) : null}
        {invoice.customer_address ? (
          <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{invoice.customer_address}</p>
        ) : null}
      </div>

      {snapshot ? (
        <div className="mt-6 grid gap-2 rounded-lg bg-cream/50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.yardageHeadDays > 0 ? (
            <SummaryChip
              label="Yardage"
              value={`${formatHeadDays(snapshot.yardageHeadDays)} head-days`}
              sub={
                snapshot.rates.yardagePerHeadDay != null
                  ? `@ ${formatMoney(snapshot.rates.yardagePerHeadDay)}/day`
                  : undefined
              }
            />
          ) : null}
          {snapshot.pastureHeadDays > 0 ? (
            <SummaryChip
              label="Pasture"
              value={`${formatHeadDays(snapshot.pastureHeadDays)} head-days`}
              sub={
                snapshot.rates.pasturePerHeadDay != null
                  ? `@ ${formatMoney(snapshot.rates.pasturePerHeadDay)}/day`
                  : undefined
              }
            />
          ) : null}
          {snapshot.feedSummary ? (
            <SummaryChip
              label="Feed delivered"
              value={
                snapshot.feedSummary.totalTons > 0
                  ? `${formatTons(snapshot.feedSummary.totalTons)} tons`
                  : snapshot.feedSummary.totalCost != null
                    ? formatMoney(snapshot.feedSummary.totalCost)
                    : `${snapshot.feedSummary.deliveryCount} deliveries`
              }
              sub={
                (snapshot.feedSummary.rations?.length ?? 0) > 0
                  ? snapshot.feedSummary.rations!
                      .map((r) =>
                        r.tons != null && r.tons > 0
                          ? `${r.rationName}: ${formatTons(r.tons)}t · ${formatMoney(r.totalCost)}`
                          : `${r.rationName}: ${formatMoney(r.totalCost)}`,
                      )
                      .join(" · ")
                  : `${snapshot.feedSummary.deliveryCount} feeding${snapshot.feedSummary.deliveryCount === 1 ? "" : "s"}`
              }
            />
          ) : null}
          {snapshot.groups.length > 0 ? (
            <SummaryChip
              label="Lots billed"
              value={String(snapshot.groups.length)}
              sub={snapshot.groups.map((g) => g.groupName).slice(0, 2).join(", ")}
            />
          ) : null}
        </div>
      ) : null}

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-navy/30 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <th className="py-2 pr-4">Charge</th>
            <th className="py-2 pr-4 text-right">Qty</th>
            <th className="py-2 pr-4 text-right">Rate</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => {
            const isDead = line.category === "dead";
            const amount = isDead ? "—" : formatMoney(line.line_total);
            return (
              <tr key={line.id} className="border-b border-border/60 align-top">
                <td className="py-3 pr-4">
                  <p className="font-medium text-navy">
                    {line.category ? categoryLabel(line.category) : "Charge"}
                  </p>
                  <p className="mt-0.5 text-text-secondary">{describeInvoiceLine(line)}</p>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-text-secondary">
                  {isDead ? `${line.quantity} hd` : formatQty(line)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-text-secondary">
                  {formatUnitPrice(line)}
                </td>
                <td className="py-3 text-right font-medium tabular-nums">{amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end border-t border-border-neutral pt-4">
        <p className="text-xl font-bold text-brown">Total: {formatMoney(invoice.subtotal)}</p>
      </div>

      {invoice.notes && !period ? (
        <div className="mt-6 border-t border-border-neutral pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Notes</p>
          <p className="mt-2 text-sm text-text-primary/80">{invoice.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-white/80 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="font-semibold text-navy">{value}</p>
      {sub ? <p className="text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}
