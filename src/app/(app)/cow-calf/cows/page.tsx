import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getCowSummary, listCows } from "@/lib/cow-calf/queries";
import { CowList } from "@/components/cow-calf/cow-list";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Cows — LAORS",
};

export default async function CowsPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const [cows, summary] = await Promise.all([listCows(orgId), getCowSummary(orgId)]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/cow-calf" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
            ← Cow-Calf
          </Link>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Cows & heifers</h1>
          <p className="text-text-secondary">
            {summary.active} active · {summary.cows} cows · {summary.heifers} heifers
          </p>
        </div>
        {canManage ? (
          <Link href="/cow-calf/cows/new">
            <Button size="lg">+ Register</Button>
          </Link>
        ) : null}
      </div>
      <CowList cows={cows} />
    </div>
  );
}
