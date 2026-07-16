import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { listFeedRationOptions } from "@/lib/feed/queries";
import { getRationUnitPrices } from "@/lib/feed/inventory-queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { listOwnerOptions } from "@/lib/owners/queries";
import { toFeedGroupOptions, rationCostsToRecord, ownersToSelectOptions } from "@/lib/feed/options";
import { FeedingForm } from "@/components/feed/feeding-form";
import { AppPageShell } from "@/components/layout/app-page-shell";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Log Cow-Calf Feed — LAORS",
};

export default async function NewCowCalfFeedPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/feed");

  const orgId = session.organization!.id;

  const [locations, groups, owners, members, rationOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOwnerOptions(orgId).then(ownersToSelectOptions),
    listOrgMembers(orgId),
    listFeedRationOptions(orgId),
  ]);

  const rationUnitCosts = rationCostsToRecord(
    await getRationUnitPrices(
      orgId,
      rationOptions.map((r) => r.id),
    ),
  );

  return (
    <AppPageShell>
      <div className="space-y-6">
        <div>
          <Link href="/feed/cow-calf" className="text-sm font-medium text-brown hover:underline">
            ← Cow-calf feed
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-navy">Log feed</h1>
        </div>
        <FeedingForm
          orgId={orgId}
          rationOptions={rationOptions}
          rationUnitCosts={rationUnitCosts}
          locationOptions={locations}
          groupOptions={groups}
          ownerOptions={owners}
          memberOptions={members}
          feedingContext="cow_calf"
          detailBasePath="/feed/cow-calf"
          listPath="/feed/cow-calf"
        />
      </div>
    </AppPageShell>
  );
}
