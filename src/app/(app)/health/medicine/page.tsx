import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listMedicineItems } from "@/lib/medicine/queries";
import { MedicineList } from "@/components/health/medicine-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Medicine — LAORS",
};

export default async function MedicinePage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const items = await listMedicineItems(orgId);
  const lowStock = items.filter((i) => i.is_low_stock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/health" className="text-sm font-medium text-olive hover:underline">
            ← Health
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Medicine catalog</h1>
          <p className="text-charcoal/70">
            Pricing and on-hand stock — {items.length} item{items.length === 1 ? "" : "s"}
            {lowStock > 0 ? ` · ${lowStock} low stock` : ""}
          </p>
        </div>
        <Link href="/health/medicine/new">
          <Button size="lg">+ Add</Button>
        </Link>
      </div>

      <MedicineList
        items={items}
        emptyMessage="No medicine tracked yet — add your vaccines and supplies."
      />
    </div>
  );
}
