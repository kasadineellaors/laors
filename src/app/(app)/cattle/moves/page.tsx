import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listRecentMovements } from "@/lib/inventory/queries";
import { getRanchOptions } from "@/lib/locations/options";
import { MoveHistoryList } from "@/components/inventory/move-history-list";

export const metadata: Metadata = {
  title: "Move History — LAORS",
};

export default async function MoveHistoryPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [movements, movementReasons] = await Promise.all([
    listRecentMovements(orgId),
    getRanchOptions(orgId, "movement_reasons"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cattle" className="text-sm font-medium text-olive hover:underline">
          ← Cattle
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Move history</h1>
        <p className="text-charcoal/70">Edit notes or void a move to reverse counts</p>
      </div>

      <MoveHistoryList
        orgId={orgId}
        movements={movements}
        movementReasonOptions={movementReasons}
      />
    </div>
  );
}
