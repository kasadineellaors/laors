import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchTotalHeadCount } from "@/lib/locations/rollups";
import { CattleGroupsList } from "@/components/inventory/cattle-groups-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cattle — LAORS",
};

export default async function CattlePage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const canManageCattle = canWriteInventory(session.membership?.system_role);

  const [groups, totalHead] = await Promise.all([
    listCattleGroups(orgId),
    getRanchTotalHeadCount(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Cattle</h1>
          <p className="text-charcoal/70">{totalHead} head ranch-wide</p>
        </div>
        {canManageCattle ? (
          <Link href="/cattle/new">
            <Button size="lg">+ Group</Button>
          </Link>
        ) : null}
      </div>

      {canManageCattle ? (
        <div className="grid grid-cols-2 gap-3">
          <Link href="/cattle/move">
            <Button variant="secondary" fullWidth size="lg">
              Move Cattle
            </Button>
          </Link>
          <Link href="/cattle/moves">
            <Button variant="outline" fullWidth size="lg">
              Move History
            </Button>
          </Link>
        </div>
      ) : (
        <p className="text-sm text-charcoal/60">
          View-only — managers record moves and count changes.
        </p>
      )}

      <CattleGroupsList groups={groups} />
    </div>
  );
}
