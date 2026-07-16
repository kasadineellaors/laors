import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { MoveCattleForm } from "@/components/inventory/move-cattle-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { EmptyState } from "@/components/ui/empty-state";

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
    <AppPageShell narrow>
      <AppPageHeader
        title="Move cattle"
        subtitle="By pen and group — partial or full"
        backHref="/cattle"
        backLabel="Lots"
      />

      {activeGroups.length === 0 ? (
        <EmptyState
          title="No active lots to move"
          description="Receive cattle to create a lot with head counts before recording a move."
          actionHref="/cattle/new"
          actionLabel="+ Receive cattle"
        />
      ) : (
        <MoveCattleForm
          orgId={orgId}
          groups={activeGroups}
          locationOptions={locationOptions}
          movementReasonOptions={movementReasons}
          initialSourceGroupId={from}
        />
      )}
    </AppPageShell>
  );
}
