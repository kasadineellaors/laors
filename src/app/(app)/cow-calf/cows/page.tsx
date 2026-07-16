import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getCowSummary, listCows } from "@/lib/cow-calf/queries";
import { CowList } from "@/components/cow-calf/cow-list";
import { AppPageHeader } from "@/components/layout/app-page-header";
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
      <AppPageHeader
        title="Cows & heifers"
        subtitle={`${summary.active} active · ${summary.cows} cows · ${summary.heifers} heifers`}
        backHref="/cow-calf"
        backLabel="Cow-Calf"
        actions={
          canManage ? (
            <Link href="/cow-calf/cows/new">
              <Button size="lg">+ Register</Button>
            </Link>
          ) : undefined
        }
      />
      <CowList cows={cows} />
    </div>
  );
}
