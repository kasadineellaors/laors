import Link from "next/link";
import type { InvoiceRecord } from "@/lib/invoices/types";

const STATUS_LABELS: Record<InvoiceRecord["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  cancelled: "Cancelled",
};

interface InvoiceListProps {
  invoices: InvoiceRecord[];
  emptyMessage?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function InvoiceList({ invoices, emptyMessage }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No invoices yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {invoices.map((inv) => (
        <li key={inv.id}>
          <Link
            href={`/invoices/${inv.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">{inv.customer_name}</p>
                <p className="text-sm text-charcoal/60">{inv.invoice_number}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-olive">{formatMoney(inv.subtotal)}</p>
                <p className="text-xs text-charcoal/50">{STATUS_LABELS[inv.status]}</p>
              </div>
            </div>
            <p className="mt-1 text-xs text-charcoal/50">{formatDate(inv.invoice_date)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
