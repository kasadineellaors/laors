import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions, getRanchOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { listFeedRationOptions } from "@/lib/feed/queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { FeedingForm } from "@/components/feed/feeding-form";

export const metadata: Metadata = {
  title: "Log Feeding — LAORS",
};

export default async function NewFeedingPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [locations, groups, owners, members, rationOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({ value: g.id, label: `${g.name} (${g.total_head} hd)` })),
    ),
    getRanchOptions(orgId, "ownership_groups"),
    listOrgMembers(orgId),
    listFeedRationOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/feed/log" className="text-sm font-medium text-olive hover:underline">
          ← Feed log
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Log feeding</h1>
      </div>
      <FeedingForm
        orgId={orgId}
        rationOptions={rationOptions}
        locationOptions={locations}
        groupOptions={groups}
        ownerOptions={owners}
        memberOptions={members}
      />
    </div>
  );
}
