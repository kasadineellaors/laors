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
        <Link href="/cattle" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Cattle
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Move history</h1>
        <p className="text-text-secondary">Edit notes or void a move to reverse counts</p>
      </div>

      <MoveHistoryList
        orgId={orgId}
        movements={movements}
        movementReasonOptions={movementReasons}
      />
    </div>
  );
}
