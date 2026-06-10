import type { InvoicePrintData } from "@/lib/invoices/print-types";
import { formatOrgAddress } from "@/lib/invoices/print-types";

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function InvoiceDocument({ invoice, org }: InvoicePrintData) {
  const orgAddress = formatOrgAddress(org);

  return (
    <div className="invoice-document rounded-xl border border-border bg-white px-6 py-8 text-charcoal shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div>
          <p className="text-lg font-bold text-olive">{org.name}</p>
          {orgAddress ? (
            <p className="mt-1 whitespace-pre-line text-sm text-charcoal/70">{orgAddress}</p>
          ) : null}
          {org.phone ? <p className="mt-1 text-sm text-charcoal/70">{org.phone}</p> : null}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold tracking-wide text-charcoal">INVOICE</p>
          <p className="mt-1 text-sm font-semibold text-charcoal/80">{invoice.invoice_number}</p>
          <p className="mt-2 text-sm text-charcoal/70">Date: {formatDate(invoice.invoice_date)}</p>
          {invoice.due_date ? (
            <p className="text-sm text-charcoal/70">Due: {formatDate(invoice.due_date)}</p>
          ) : null}
          <p className="mt-1 text-sm capitalize text-charcoal/60">{invoice.status}</p>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Bill to</p>
        <p className="mt-2 text-lg font-semibold text-charcoal">{invoice.customer_name}</p>
        {invoice.customer_email ? (
          <p className="text-sm text-charcoal/70">{invoice.customer_email}</p>
        ) : null}
        {invoice.customer_address ? (
          <p className="mt-1 whitespace-pre-line text-sm text-charcoal/70">{invoice.customer_address}</p>
        ) : null}
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-olive/30 text-left text-xs font-semibold uppercase tracking-wide text-charcoal/60">
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4 text-right">Qty</th>
            <th className="py-2 pr-4 text-right">Unit</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="border-b border-border/60">
              <td className="py-3 pr-4">{line.description}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{line.quantity}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(line.unit_price)}</td>
              <td className="py-3 text-right font-medium tabular-nums">{formatMoney(line.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end border-t border-border pt-4">
        <p className="text-xl font-bold text-olive">Total: {formatMoney(invoice.subtotal)}</p>
      </div>

      {invoice.notes ? (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Notes</p>
          <p className="mt-2 text-sm text-charcoal/80">{invoice.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
