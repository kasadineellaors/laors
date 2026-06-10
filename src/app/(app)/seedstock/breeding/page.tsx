import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { getBreedingSummary, listBreedingRecords } from "@/lib/cow-calf/breeding-queries";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { BreedingList } from "@/components/cow-calf/breeding-list";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Seedstock Breeding — LAORS",
};

export default async function SeedstockBreedingPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const [records, summary] = await Promise.all([
    listBreedingRecords(orgId, "seedstock"),
    getBreedingSummary(orgId, "seedstock"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seedstock" className="text-sm font-medium text-olive hover:underline">
          ← Seedstock
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Breeding</h1>
        <p className="text-charcoal/70">AI, natural service, and embryo transfer records</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Bred", value: summary.activeBred },
          { label: "Confirmed", value: summary.confirmed },
          { label: "Due in 30 days", value: summary.dueNext30Days },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-surface px-3 py-4 text-center"
          >
            <p className="text-2xl font-bold text-olive">{stat.value}</p>
            <p className="text-xs text-charcoal/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {canManage ? (
        <Link href="/seedstock/breeding/new">
          <Button fullWidth size="lg">
            + Record breeding
          </Button>
        </Link>
      ) : null}

      <BreedingList
        records={records}
        detailHrefPrefix="/seedstock/breeding"
        emptyMessage="No seedstock breeding records yet."
      />
    </div>
  );
}
