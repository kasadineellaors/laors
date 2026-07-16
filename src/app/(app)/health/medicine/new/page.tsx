import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { MedicineForm } from "@/components/health/medicine-form";

export const metadata: Metadata = {
  title: "Add Medicine — LAORS",
};

export default async function NewMedicinePage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <Link href="/health/medicine" className="text-sm font-medium text-brown hover:underline">
          ← Medicine Inventory
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          Add medicine
        </h1>
      </div>
      <MedicineForm orgId={orgId} />
    </div>
  );
}
