"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomerOption } from "@/lib/customers/types";
import type { InvoiceRecord, InvoiceStatus } from "@/lib/invoices/types";
import { archiveInvoice, updateInvoiceStatus } from "@/lib/actions/invoices";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { Button } from "@/components/ui/button";

interface InvoiceDetailClientProps {
  orgId: string;
  invoice: InvoiceRecord;
  canEdit: boolean;
  customerOptions?: CustomerOption[];
}

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

export function InvoiceDetailClient({
  orgId,
  invoice,
  canEdit,
  customerOptions = [],
}: InvoiceDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: InvoiceStatus) {
    setLoading(true);
    setError(null);
    const result = await updateInvoiceStatus(orgId, invoice.id, status);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleArchive() {
    if (!window.confirm("Archive this invoice?")) return;
    setLoading(true);
    const result = await archiveInvoice(orgId, invoice.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/invoices");
  }

  if (editing && canEdit) {
    return (
      <div className="space-y-4">
        <Link href="/invoices" className="text-sm font-medium text-olive hover:underline">
          ← Invoices
        </Link>
        <InvoiceForm
          orgId={orgId}
          invoice={invoice}
          customerOptions={customerOptions}
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="text-sm font-medium text-olive hover:underline">
        ← Invoices
      </Link>

      <div className="rounded-xl border border-border bg-surface px-4 py-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-charcoal/50">
          {invoice.invoice_number}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">{invoice.customer_name}</h1>
        <p className="mt-2 text-3xl font-bold text-olive">{formatMoney(invoice.subtotal)}</p>
        <p className="text-sm capitalize text-charcoal/60">{invoice.status}</p>
        <p className="text-sm text-charcoal/60">{formatDate(invoice.invoice_date)}</p>

        <ul className="mt-6 space-y-2 border-t border-border pt-4">
          {invoice.lines.map((line) => (
            <li key={line.id} className="flex justify-between text-sm">
              <span className="text-charcoal">
                {line.description} × {line.quantity}
              </span>
              <span className="font-medium text-charcoal">{formatMoney(line.line_total)}</span>
            </li>
          ))}
        </ul>

        {invoice.notes ? (
          <p className="mt-4 text-sm text-charcoal/70">{invoice.notes}</p>
        ) : null}
      </div>

      {canEdit ? (
        <div className="grid grid-cols-3 gap-2">
          {invoice.status === "draft" ? (
            <Button size="lg" onClick={() => setStatus("sent")} disabled={loading}>
              Mark sent
            </Button>
          ) : null}
          {invoice.status !== "paid" ? (
            <Button size="lg" variant="secondary" onClick={() => setStatus("paid")} disabled={loading}>
              Mark paid
            </Button>
          ) : null}
          <Button size="lg" variant="outline" onClick={() => setEditing(true)} disabled={loading}>
            Edit
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <Button variant="danger" fullWidth onClick={handleArchive} disabled={loading}>
          Archive invoice
        </Button>
      ) : null}
    </div>
  );
}
