import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canDeductInventoryOnSale } from "@/lib/auth/roles";
import { listCustomerOptions } from "@/lib/customers/queries";
import { getSeedstockAnimal } from "@/lib/seedstock/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { getRanchFieldSuggestions } from "@/lib/ranch/field-suggestions";
import { SaleForm } from "@/components/sales/sale-form";

export const metadata: Metadata = {
  title: "Record Sale — LAORS",
};

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ animalId?: string }>;
}) {
  const { animalId } = await searchParams;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const canDeduct = canDeductInventoryOnSale(session.membership?.system_role);

  const prefillAnimal = animalId
    ? await getSeedstockAnimal(orgId, animalId).then((a) =>
        a
          ? {
              id: a.id,
              tagNumber: a.tag_number,
              name: a.name,
              animalType: a.animal_type,
            }
          : null,
      )
    : null;

  const [locations, groups, categories, customerOptions, fieldSuggestions] = await Promise.all([
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
    getRanchFieldSuggestions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={prefillAnimal ? `/seedstock/animals/${prefillAnimal.id}` : "/sales"}
          className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          {prefillAnimal ? `← ${prefillAnimal.tagNumber}` : "← Sales"}
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          {prefillAnimal ? `Sell ${prefillAnimal.tagNumber}` : "Record sale"}
        </h1>
      </div>
      <SaleForm
        orgId={orgId}
        locationOptions={locations}
        groupOptions={groups}
        categoryOptions={categories}
        customerOptions={customerOptions}
        buyerSuggestions={fieldSuggestions.buyers}
        canDeductInventory={canDeduct}
        prefillAnimal={prefillAnimal ?? undefined}
      />
    </div>
  );
}
