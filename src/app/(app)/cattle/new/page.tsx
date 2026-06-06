import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCustomerOptions } from "@/lib/customers/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { CreateGroupForm } from "@/components/inventory/create-group-form";

export const metadata: Metadata = {
  title: "New Group — LAORS",
};

export default async function NewCattleGroupPage() {
  const session = await requireOnboardedUser();
  if (!canWriteInventory(session.membership?.system_role)) {
    redirect("/cattle");
  }
  const orgId = session.organization!.id;

  const [locationOptions, ownershipOptions, customerOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    getRanchOptions(orgId, "ownership_groups"),
    listCustomerOptions(orgId).then((rows) =>
      rows.map((c) => ({ value: c.id, label: c.name })),
    ),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cattle" className="text-sm font-medium text-olive hover:underline">
          ← Cattle
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">New cattle group</h1>
      </div>
      <CreateGroupForm
        orgId={orgId}
        locationOptions={locationOptions}
        ownershipOptions={ownershipOptions}
        customerOptions={customerOptions}
      />
    </div>
  );
}
