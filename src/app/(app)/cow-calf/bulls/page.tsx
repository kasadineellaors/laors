import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { listBulls } from "@/lib/cow-calf/queries";
import { BullList } from "@/components/cow-calf/bull-list";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Bulls — LAORS",
};

export default async function BullsPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const bulls = await listBulls(orgId);

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Bulls"
        subtitle={`${bulls.filter((b) => b.status === "active").length} active`}
        backHref="/cow-calf"
        backLabel="Cow-Calf"
        actions={
          canManage ? (
            <Link href="/cow-calf/bulls/new">
              <Button size="lg">+ Bull</Button>
            </Link>
          ) : undefined
        }
      />
      <BullList bulls={bulls} />
    </div>
  );
}
