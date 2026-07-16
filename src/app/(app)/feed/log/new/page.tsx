import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getFeedingRecord, listFeedRationOptions } from "@/lib/feed/queries";
import { getRationUnitPrices } from "@/lib/feed/inventory-queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { listOwnerOptions } from "@/lib/owners/queries";
import type { FeedingFormPrefill } from "@/lib/feed/types";
import { toFeedGroupOptions, rationCostsToRecord, ownersToSelectOptions } from "@/lib/feed/options";
import { FeedingForm } from "@/components/feed/feeding-form";

export const metadata: Metadata = {
  title: "Log Feeding — LAORS",
};

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function NewFeedingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const params = await searchParams;

  const [locations, groups, ownerOptions, members, rationOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOwnerOptions(orgId).then(ownersToSelectOptions),
    listOrgMembers(orgId),
    listFeedRationOptions(orgId),
  ]);

  const rationIds = rationOptions.map((r) => r.id);
  const rationUnitCosts = rationCostsToRecord(await getRationUnitPrices(orgId, rationIds));

  let prefill: FeedingFormPrefill | undefined;

  const repeatId = param(params.repeat);
  if (repeatId) {
    const feeding = await getFeedingRecord(orgId, repeatId);
    if (feeding) {
      prefill = {
        groupId: feeding.cattle_group_id ?? undefined,
        locationId: feeding.location_id ?? undefined,
        ownerId: feeding.ownership_group_id ?? undefined,
        feedRationId: feeding.feed_ration_id,
        quantity: String(feeding.quantity),
      };
    }
  } else {
    prefill = {
      groupId: param(params.group),
      locationId: param(params.location),
      ownerId: param(params.owner),
      feedRationId: param(params.ration),
      quantity: param(params.quantity),
    };
    if (Object.values(prefill).every((v) => !v)) {
      prefill = undefined;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/feed/log" className="text-sm font-medium text-brown hover:underline">
          ← Feed log
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-navy">Log feeding</h1>
      </div>
      <FeedingForm
        orgId={orgId}
        rationOptions={rationOptions}
        rationUnitCosts={rationUnitCosts}
        locationOptions={locations}
        groupOptions={groups}
        ownerOptions={ownerOptions}
        memberOptions={members}
        prefill={prefill}
      />
    </div>
  );
}
