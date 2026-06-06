import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices } from "@/lib/auth/roles";
import { listCustomerOptions } from "@/lib/customers/queries";
import { getInvoice } from "@/lib/invoices/queries";
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

  const invoice = await getInvoice(orgId, id);
  if (!invoice) notFound();

  const canEdit = canManageInvoices(session.membership?.system_role);
  const customerOptions = canEdit ? await listCustomerOptions(orgId) : [];

  return (
    <InvoiceDetailClient
      orgId={orgId}
      invoice={invoice}
      canEdit={canEdit}
      customerOptions={customerOptions}
    />
  );
}
