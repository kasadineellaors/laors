import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCalves } from "@/lib/cow-calf/herd-queries";
import { getProcessedCalfIds } from "@/lib/cow-calf/calving-alert-queries";
import { CalfList } from "@/components/cow-calf/calf-list";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Calves — Cow-Calf — LAORS",
};

export default async function CalvesPage() {
  const session = await requireCowCalfEnterprise();
  const canManage = canWriteInventory(session.membership?.system_role);
  const orgId = session.organization!.id;
  const [calves, birthProcessed] = await Promise.all([
    listCalves(orgId),
    getProcessedCalfIds(orgId, "birth_processing"),
  ]);

  const enriched = calves.map((c) => ({
    ...c,
    birth_processed: c.id.startsWith("calving-") ? false : birthProcessed.has(c.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AppPageHeader
          title="Calves"
          subtitle="Calves at side, birth records, and processing status."
        />
        {canManage ? (
          <div className="flex gap-2">
            <Link href="/cow-calf/processing/new">
              <Button variant="secondary" size="lg">Process</Button>
            </Link>
            <Link href="/cow-calf/calving/new">
              <Button size="lg">+ Log calving</Button>
            </Link>
          </div>
        ) : (
          <Link href="/cow-calf/calving/new">
            <Button size="lg">+ Log calving</Button>
          </Link>
        )}
      </div>
      <CalfList calves={enriched} />
    </div>
  );
}
