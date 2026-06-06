import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canDeductInventoryOnSale } from "@/lib/auth/roles";
import { listCustomerOptions } from "@/lib/customers/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { SaleForm } from "@/components/sales/sale-form";

export const metadata: Metadata = {
  title: "Record Sale — LAORS",
};

export default async function NewSalePage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const canDeduct = canDeductInventoryOnSale(session.membership?.system_role);

  const [locations, groups, categories, customerOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({
        value: g.id,
        label: `${g.name} (${g.total_head} hd)`,
      })),
    ),
    getRanchOptions(orgId, "financial_categories").then((opts) =>
      opts.filter((o) => o.meta?.category_type === "income"),
    ),
    listCustomerOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/sales" className="text-sm font-medium text-olive hover:underline">
          ← Sales
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Record sale</h1>
      </div>
      <SaleForm
        orgId={orgId}
        locationOptions={locations}
        groupOptions={groups}
        categoryOptions={categories}
        customerOptions={customerOptions}
        canDeductInventory={canDeduct}
      />
    </div>
  );
}
