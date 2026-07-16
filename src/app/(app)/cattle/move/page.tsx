import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { MoveCattleForm } from "@/components/inventory/move-cattle-form";

export const metadata: Metadata = {
  title: "Move Cattle — LAORS",
};

export default async function MoveCattlePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const session = await requireOnboardedUser();
  if (!canWriteInventory(session.membership?.system_role)) {
    redirect("/cattle");
  }
  const orgId = session.organization!.id;

  const [groups, locationOptions, movementReasons] = await Promise.all([
    listCattleGroups(orgId),
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    getRanchOptions(orgId, "movement_reasons"),
  ]);

  const activeGroups = groups.filter((g) => g.total_head > 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cattle" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Cattle
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Move cattle</h1>
        <p className="text-text-secondary">By pen and group — partial or full</p>
      </div>

      {activeGroups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-6 py-10 text-center text-text-secondary">
          Create a group with head counts before moving cattle.
        </p>
      ) : (
        <MoveCattleForm
          orgId={orgId}
          groups={activeGroups}
          locationOptions={locationOptions}
          movementReasonOptions={movementReasons}
          initialSourceGroupId={from}
        />
      )}
    </div>
  );
}
