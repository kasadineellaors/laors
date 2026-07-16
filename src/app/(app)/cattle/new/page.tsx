import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { listOwnerOptions } from "@/lib/owners/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { CreateGroupForm } from "@/components/inventory/create-group-form";

export const metadata: Metadata = {
  title: "Receive Lot — LAORS",
};

export default async function NewCattleGroupPage() {
  const session = await requireOnboardedUser();
  if (!canWriteInventory(session.membership?.system_role)) {
    redirect("/cattle");
  }
  const orgId = session.organization!.id;

  const [locationOptions, ownerOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listOwnerOptions(orgId).then((rows) =>
      rows.map((o) => ({
        value: o.id,
        label: o.is_ownership_group ? `${o.name} (group)` : o.name,
      })),
    ),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cattle" className="text-sm font-medium text-olive hover:underline">
          ← Lots & cattle
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Receive lot</h1>
      </div>
      <CreateGroupForm
        orgId={orgId}
        locationOptions={locationOptions}
        ownerOptions={ownerOptions}
      />
    </div>
  );
}
