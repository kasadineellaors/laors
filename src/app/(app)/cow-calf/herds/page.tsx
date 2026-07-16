import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { getHerdInventorySummary, listCowCalfHerds } from "@/lib/cow-calf/herd-queries";
import { HerdCard } from "@/components/cow-calf/herd-card";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Herds — Cow-Calf — LAORS",
};

export default async function CowCalfHerdsPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const herds = await listCowCalfHerds(orgId);
  const herdsWithInventory = await Promise.all(
    herds.map(async (herd) => ({
      herd,
      inventory: await getHerdInventorySummary(orgId, herd),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AppPageHeader
          title="Herds"
          subtitle="Cow-calf pasture groups — separate from Stocker lots."
        />
        {canManage ? (
          <Link href="/cow-calf/herds/new">
            <Button size="lg">+ Create herd</Button>
          </Link>
        ) : null}
      </div>

      {herdsWithInventory.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral bg-tan/10 px-4 py-8 text-center text-sm text-text-secondary">
          No herds yet. Create a herd to track cows, calves at side, and pairs by pasture.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {herdsWithInventory.map(({ herd, inventory }) => (
            <HerdCard key={herd.id} herd={herd} inventory={inventory} />
          ))}
        </div>
      )}
    </div>
  );
}
