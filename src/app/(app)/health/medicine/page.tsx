import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listArchivedMedicineItems, listMedicineItems } from "@/lib/medicine/queries";
import { MedicineList } from "@/components/health/medicine-list";
import { MedicineSummaryMetrics } from "@/components/health/medicine-summary-metrics";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Medicine Inventory — LAORS",
};

export default async function MedicinePage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const [items, archivedItems] = await Promise.all([
    listMedicineItems(orgId),
    listArchivedMedicineItems(orgId),
  ]);

  const lowStock = items.filter((i) => i.is_low_stock && !i.is_out_of_stock).length;
  const outOfStock = items.filter((i) => i.is_out_of_stock).length;

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col gap-6 pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/health" className="text-sm font-medium text-brown hover:underline">
            ← Health
          </Link>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
            Medicine Inventory
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            On-hand medicine, cost, reorder levels, lots, and expiration dates.
          </p>
        </div>
        <Link href="/health/medicine/new" className="sm:shrink-0">
          <Button size="md" fullWidth className="sm:w-auto">
            + Add Medicine
          </Button>
        </Link>
      </div>

      <MedicineSummaryMetrics
        activeProducts={items.length}
        lowStock={lowStock}
        outOfStock={outOfStock}
      />

      <MedicineList
        items={items}
        archivedItems={archivedItems}
        emptyMessage="No medicine tracked yet — add your vaccines and supplies."
      />
    </div>
  );
}
