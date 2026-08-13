import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { listCowCalfHerdOptions } from "@/lib/cow-calf/breeding-queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { CowCalfShippingForm } from "@/components/cow-calf/shipping-form";

export const metadata: Metadata = {
  title: "Ship Cattle — Cow-Calf — LAORS",
};

export default async function NewCowCalfShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ herd?: string; group?: string }>;
}) {
  const { herd, group } = await searchParams;
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;

  const [locations, herds, groups] = await Promise.all([
    getTreePickerOptions(orgId),
    listCowCalfHerdOptions(orgId),
    listCattleGroups(orgId),
  ]);

  const lotOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cow-calf/shipping" className="text-sm font-medium text-brown hover:underline">
          ← Shipping
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          Ship cattle
        </h1>
      </div>
      <CowCalfShippingForm
        orgId={orgId}
        herdOptions={herds}
        lotOptions={lotOptions}
        locationTree={locations}
        defaultHerdId={herd}
        defaultLotId={group}
      />
    </div>
  );
}
