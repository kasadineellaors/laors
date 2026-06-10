import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getTreePickerOptions, getRanchOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { listFeedRationOptions } from "@/lib/feed/queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { FeedingForm } from "@/components/feed/feeding-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Log Cow-Calf Feed — LAORS",
};

export default async function NewCowCalfFeedPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

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
        <Link href="/cow-calf/feed" className="text-sm font-medium text-olive hover:underline">
          ← Cow-calf feed
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Log feed</h1>
      </div>
      <FeedingForm
        orgId={orgId}
        rationOptions={rationOptions}
        locationOptions={locations}
        groupOptions={groups}
        ownerOptions={owners}
        memberOptions={members}
        feedingContext="cow_calf"
        detailBasePath="/cow-calf/feed"
        listPath="/cow-calf/feed"
      />
    </div>
  );
}
