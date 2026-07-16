import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { getCowCalfHerd, getHerdInventorySummary } from "@/lib/cow-calf/herd-queries";
import { RECORDKEEPING_MODE_LABELS, HERD_STATUS_LABELS } from "@/lib/cow-calf/statuses";
import { HerdQuickActions } from "@/components/cow-calf/herd-quick-actions";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Herd — Cow-Calf — LAORS",
};

export default async function HerdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;

  const herd = await getCowCalfHerd(orgId, id);
  if (!herd) notFound();

  const inventory = await getHerdInventorySummary(orgId, herd);

  return (
    <div className="space-y-6">
      <AppPageHeader title={herd.name} subtitle={herd.location_name ?? "No location assigned"} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Cows", value: inventory.cows },
          { label: "Calves at side", value: inventory.calvesAtSide },
          { label: "Pairs", value: inventory.pairs },
          { label: "Bulls", value: inventory.bulls },
          { label: "Total head", value: inventory.totalPhysicalHead },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border-neutral bg-surface-white px-3 py-4 text-center"
          >
            <p className="text-2xl font-bold text-brown">{stat.value}</p>
            <p className="text-xs text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Herd details</CardTitle>
          <CardDescription>
            {HERD_STATUS_LABELS[herd.status]} · {RECORDKEEPING_MODE_LABELS[herd.recordkeeping_mode]}
          </CardDescription>
        </CardHeader>
        <dl className="grid gap-3 px-4 pb-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-secondary">Owner</dt>
            <dd className="font-medium text-navy">{herd.owner_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Breeding season</dt>
            <dd className="font-medium text-navy">{herd.breeding_season ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Calving season</dt>
            <dd className="font-medium text-navy">{herd.calving_season ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Individually identified</dt>
            <dd className="font-medium text-navy">{inventory.individuallyIdentified}</dd>
          </div>
          {herd.recordkeeping_mode !== "individual" ? (
            <>
              <div>
                <dt className="text-text-secondary">Group-only cows</dt>
                <dd className="font-medium text-navy">{inventory.groupOnlyCows}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Group-only calves</dt>
                <dd className="font-medium text-navy">{inventory.groupOnlyCalvesAtSide}</dd>
              </div>
            </>
          ) : null}
        </dl>
        {herd.description ? (
          <p className="border-t border-border-neutral px-4 py-3 text-sm text-text-secondary">
            {herd.description}
          </p>
        ) : null}
      </Card>

      <HerdQuickActions herdId={herd.id} />
    </div>
  );
}
