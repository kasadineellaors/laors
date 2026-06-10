"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomerOption } from "@/lib/customers/types";
import type { InvoiceRecord, InvoiceStatus } from "@/lib/invoices/types";
import type { InvoicePrintData } from "@/lib/invoices/print-types";
import { archiveInvoice, sendInvoice, updateInvoiceStatus } from "@/lib/actions/invoices";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { Button } from "@/components/ui/button";

interface InvoiceDetailClientProps {
  orgId: string;
  printData: InvoicePrintData;
  canEdit: boolean;
  canDownloadPdf?: boolean;
  emailConfigured: boolean;
  recipientEmail?: string;
  customerOptions?: CustomerOption[];
}

export function InvoiceDetailClient({
  orgId,
  printData,
  canEdit,
  canDownloadPdf = false,
  emailConfigured,
  recipientEmail: recipientEmailProp = "",
  customerOptions = [],
}: InvoiceDetailClientProps) {
  const router = useRouter();
  const invoice = printData.invoice;
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const recipientEmail = recipientEmailProp.trim();
  const hasEmail = Boolean(recipientEmail);
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;

  async function setStatus(status: InvoiceStatus) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await updateInvoiceStatus(orgId, invoice.id, status);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleSend() {
    if (!window.confirm(`Email this invoice to ${recipientEmail || "the customer"}?`)) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await sendInvoice(orgId, invoice.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setSuccess(result.success ?? "Invoice sent");
      router.refresh();
    }
  }

  async function handleArchive() {
    if (!window.confirm("Archive this invoice?")) return;
    setLoading(true);
    const result = await archiveInvoice(orgId, invoice.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/invoices");
  }

  function handlePrint() {
    window.print();
  }

  if (editing && canEdit) {
    return (
      <div className="space-y-4 no-print">
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
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className="text-sm font-medium text-olive hover:underline">
          ← Invoices
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
            Print
          </Button>
          {canDownloadPdf ? (
            <a href={pdfUrl} download>
              <Button type="button" variant="outline" size="sm">
                Download PDF
              </Button>
            </a>
          ) : null}
        </div>
      </div>

      <InvoiceDocument invoice={printData.invoice} org={printData.org} />

      {canEdit ? (
        <div className="no-print space-y-3">
          {!hasEmail ? (
            <p className="rounded-lg border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust">
              Add a customer email on this invoice or in{" "}
              <Link href="/setup/customers" className="font-semibold underline">
                Customers
              </Link>{" "}
              before sending.
            </p>
          ) : null}

          {!emailConfigured ? (
            <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-charcoal/70">
              To email invoices, set <code className="text-xs">RESEND_API_KEY</code> and{" "}
              <code className="text-xs">INVOICE_FROM_EMAIL</code> in your environment. You can still
              print or download PDF.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {invoice.status === "draft" || invoice.status === "sent" ? (
              <Button
                size="lg"
                onClick={handleSend}
                disabled={loading || !hasEmail || !emailConfigured}
              >
                {loading ? "Sending…" : "Send invoice"}
              </Button>
            ) : null}
            {invoice.status === "draft" ? (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setStatus("sent")}
                disabled={loading}
              >
                Mark sent
              </Button>
            ) : null}
            {invoice.status !== "paid" ? (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setStatus("paid")}
                disabled={loading}
              >
                Mark paid
              </Button>
            ) : null}
            <Button size="lg" variant="outline" onClick={() => setEditing(true)} disabled={loading}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}

      {success ? (
        <p className="no-print text-sm font-medium text-olive" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="no-print text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <Button className="no-print" variant="danger" fullWidth onClick={handleArchive} disabled={loading}>
          Archive invoice
        </Button>
      ) : null}
    </div>
  );
}
