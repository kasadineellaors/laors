import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions } from "@/lib/locations/options";
import { createClient } from "@/lib/supabase/server";
import { OwnershipGroupsClient } from "@/components/setup/ownership-groups-client";

export default async function OwnershipSetupPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("ownership_groups")
    .select("id, name, ownership_type, contact_name, phone")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  const groups = (rows ?? []).map((r) => ({
    value: r.id,
    label: r.name,
    meta: {
      ownership_type: r.ownership_type,
      contact_name: r.contact_name,
      phone: r.phone,
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Ownership Groups</h1>
        <p className="text-charcoal/70">Who owns the cattle in custom feeding or partnerships</p>
      </div>
      <OwnershipGroupsClient orgId={orgId} groups={groups} />
    </div>
  );
}
