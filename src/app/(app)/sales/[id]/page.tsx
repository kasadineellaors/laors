import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canDeductInventoryOnSale, canManageInvoices } from "@/lib/auth/roles";
import { listCustomerOptions } from "@/lib/customers/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { getSale } from "@/lib/sales/queries";
import { SaleDetailClient } from "@/components/sales/sale-detail-client";

export const metadata: Metadata = {
  title: "Sale — LAORS",
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const sale = await getSale(orgId, id);
  if (!sale) notFound();

  const [locations, categories, customerOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    getRanchOptions(orgId, "financial_categories").then((opts) =>
      opts.filter((o) => o.meta?.category_type === "income"),
    ),
    listCustomerOptions(orgId),
  ]);

  const canCreateInvoice = canManageInvoices(session.membership?.system_role);
  const canDeduct = canDeductInventoryOnSale(session.membership?.system_role);

  return (
    <SaleDetailClient
      orgId={orgId}
      sale={sale}
      locationOptions={locations}
      categoryOptions={categories}
      customerOptions={customerOptions}
      canCreateInvoice={canCreateInvoice}
      canDeductInventory={canDeduct}
    />
  );
}
