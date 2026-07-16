import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { getCalvingSummary, getCowSummary, listBulls } from "@/lib/cow-calf/queries";
import { getBreedingSummary } from "@/lib/cow-calf/breeding-queries";
import { getCalvingAlertInput } from "@/lib/cow-calf/calving-alert-queries";
import { getProcessingSummary } from "@/lib/cow-calf/processing-queries";
import { getWeaningSummary } from "@/lib/cow-calf/exit-queries";
import {
  getEnterpriseInventorySummary,
  listCowCalfHerds,
} from "@/lib/cow-calf/herd-queries";
import { buildForemanSummary } from "@/lib/cow-calf/foreman-summary";
import { createClient } from "@/lib/supabase/server";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ForemanSummaryPanel } from "@/components/cow-calf/foreman-summary-panel";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Cow-Calf — LAORS",
};

export default async function CowCalfPage() {
  const session = await requireCowCalfEnterprise();
  const org = session.organization!;
  const orgId = org.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const supabase = await createClient();

  const [inventory, herds, summary, bulls, breedingSummary, cowSummary, processingSummary, weaningSummary, calvingAlerts, unassignedResult, openResult] =
    await Promise.all([
      getEnterpriseInventorySummary(orgId),
      listCowCalfHerds(orgId),
      getCalvingSummary(orgId),
      listBulls(orgId),
      getBreedingSummary(orgId),
      getCowSummary(orgId),
      getProcessingSummary(orgId),
      getWeaningSummary(orgId),
      getCalvingAlertInput(orgId),
      supabase
        .from("individual_animals")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("registry_context", "cow_calf")
        .eq("is_active", true)
        .is("cow_calf_herd_id", null)
        .in("animal_type", ["cow", "heifer"]),
      supabase
        .from("individual_animals")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("registry_context", "cow_calf")
        .eq("is_active", true)
        .eq("reproductive_status", "open"),
    ]);

  const activeBullsTurnedOut = bulls.filter((b) => b.status === "active").length;
  const bredFemales = breedingSummary.activeBred + breedingSummary.confirmed;

  const foremanItems = buildForemanSummary({
    inventory,
    breeding: breedingSummary,
    calving: summary,
    calvingAlerts,
    calvesReadyToWean: weaningSummary.calvesReadyToWean,
    herds,
    unassignedCowCount: unassignedResult.count ?? 0,
    openCowCount: openResult.count ?? 0,
  });

  const quickLinks = [
    { href: "/cow-calf/herds", title: "Herds", description: "Pasture groups, pairs, and breeding status." },
    { href: "/cow-calf/cows", title: "Cows", description: "Individual cows and heifers." },
    { href: "/cow-calf/calves", title: "Calves", description: "Calves at side, processing, and weaning status." },
    { href: "/cow-calf/bulls", title: "Bulls", description: "Breeding bulls and turn-out status." },
    { href: "/cow-calf/breeding", title: "Breeding", description: "Exposure, pregnancy checks, expected calving." },
    { href: "/cow-calf/calving", title: "Calving", description: "Record births and link calves to dams." },
    { href: "/cow-calf/processing", title: "Processing", description: "Branding, vaccination, and birth processing." },
    { href: "/cow-calf/weaning", title: "Weaning", description: "Wean calves and update pairs." },
    { href: "/cow-calf/sales", title: "Sales", description: "Cow-calf sales (separate from stocker)." },
    { href: "/cow-calf/loss", title: "Death & loss", description: "Record mortality and sync inventory." },
  ];

  return (
    <AppPageShell>
      <AppPageHeader
        title="Cow-Calf"
        subtitle="Herds, pairs, breeding, calving, and ranch foreman checks."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Cow-calf pairs", value: inventory.pairs.toString() },
          { label: "Bred females", value: bredFemales.toString() },
          { label: "Calves at side", value: inventory.calvesAtSide.toString() },
          { label: "Bulls turned out", value: activeBullsTurnedOut.toString() },
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

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-tan/20 px-3 py-2 text-center">
          <span className="font-semibold text-navy">{inventory.cows}</span> cows ·{" "}
          <span className="font-semibold text-navy">{inventory.totalPhysicalHead}</span> total head ·{" "}
          <span className="font-semibold text-navy">{inventory.herdCount}</span> herds
        </div>
        <div className="rounded-lg bg-tan/20 px-3 py-2 text-center">
          <span className="font-semibold text-navy">{cowSummary.active}</span> registered cows/heifers
        </div>
        <div className="rounded-lg bg-tan/20 px-3 py-2 text-center">
          <span className="font-semibold text-navy">{summary.thisMonth}</span> calves this month
        </div>
        <div className="rounded-lg bg-tan/20 px-3 py-2 text-center">
          <span className="font-semibold text-navy">{processingSummary.unprocessedCalves}</span> not
          birth-processed
        </div>
      </div>

      <ForemanSummaryPanel items={foremanItems} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-colors hover:border-navy hover:bg-tan/5">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/cow-calf/calving/new">
          <Button fullWidth size="lg">
            + Record calving
          </Button>
        </Link>
        {canManage ? (
          <>
            <Link href="/cow-calf/herds/new">
              <Button variant="secondary" fullWidth size="lg">
                + Create herd
              </Button>
            </Link>
            <Link href="/cow-calf/breeding/new">
              <Button variant="secondary" fullWidth size="lg">
                + Record breeding
              </Button>
            </Link>
            <Link href="/cow-calf/cows/new">
              <Button variant="secondary" fullWidth size="lg">
                + Register cow
              </Button>
            </Link>
          </>
        ) : null}
      </div>
    </AppPageShell>
  );
}
