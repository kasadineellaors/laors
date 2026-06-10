import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canExportReports, canManageInvoices } from "@/lib/auth/roles";
import { getCustomer, listCustomerOptions } from "@/lib/customers/queries";
import { isInvoiceEmailConfigured } from "@/lib/email/resend";
import { getInvoicePrintData } from "@/lib/invoices/queries";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

export const metadata: Metadata = {
  title: "Invoice — LAORS",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const printData = await getInvoicePrintData(orgId, id);
  if (!printData) notFound();

  const canEdit = canManageInvoices(session.membership?.system_role);
  const canDownloadPdf = canExportReports(session.membership?.system_role);
  const customerOptions = canEdit ? await listCustomerOptions(orgId) : [];

  let recipientEmail = printData.invoice.customer_email?.trim() || "";
  if (!recipientEmail && printData.invoice.customer_id) {
    const customer = await getCustomer(orgId, printData.invoice.customer_id);
    recipientEmail = customer?.email?.trim() || "";
  }

  return (
    <InvoiceDetailClient
      orgId={orgId}
      printData={printData}
      canEdit={canEdit}
      canDownloadPdf={canDownloadPdf}
      emailConfigured={isInvoiceEmailConfigured()}
      recipientEmail={recipientEmail}
      customerOptions={customerOptions}
    />
  );
}
