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
  searchParams: Promise<{ from?: string; mode?: string }>;
}) {
  const { from, mode } = await searchParams;
  const session = await requireOnboardedUser();
  if (!canWriteInventory(session.membership?.system_role)) {
    redirect("/cattle");
  }
  const orgId = session.organization!.id;

  const [groups, locationTree, movementReasons] = await Promise.all([
    listCattleGroups(orgId),
    getTreePickerOptions(orgId),
    getRanchOptions(orgId, "movement_reasons"),
  ]);

  const activeGroups = groups.filter((g) => g.total_head > 0);
  const initialMode = mode === "remove" ? "remove" : "move";

  return (
    <AppPageShell narrow>
      <AppPageHeader
        title={initialMode === "remove" ? "Remove cattle" : "Move cattle"}
        subtitle={
          initialMode === "remove"
            ? "Deduct head when cattle leave without a pen move"
            : "By pen and group — partial or full"
        }
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
          locationTree={locationTree}
          movementReasonOptions={movementReasons}
          initialSourceGroupId={from}
          initialMode={initialMode}
        />
      )}
    </AppPageShell>
  );
}
