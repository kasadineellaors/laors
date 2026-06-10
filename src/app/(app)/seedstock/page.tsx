import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { getBreedingSummary } from "@/lib/cow-calf/breeding-queries";
import { getSeedstockSummary } from "@/lib/seedstock/queries";
import type { OperationMode } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Seedstock — LAORS",
};

export default async function SeedstockPage() {
  const session = await requireOnboardedUser();
  const org = session.organization!;
  const modes = (org.enabled_modes ?? []) as OperationMode[];

  if (!hasSeedstockMode(modes)) {
    redirect("/cattle");
  }

  const orgId = org.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const [summary, breedingSummary] = await Promise.all([
    getSeedstockSummary(orgId),
    getBreedingSummary(orgId, "seedstock"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Seedstock</h1>
        <p className="text-charcoal/70">Individual animals, pedigree, and EPDs</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Registered", value: summary.total.toString() },
          { label: "Active", value: summary.active.toString() },
          { label: "Bulls", value: summary.bulls.toString() },
          { label: "Cows & heifers", value: summary.females.toString() },
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

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Bred", value: breedingSummary.activeBred },
          { label: "Confirmed", value: breedingSummary.confirmed },
          { label: "Due in 30 days", value: breedingSummary.dueNext30Days },
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/seedstock/animals">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Animal registry</CardTitle>
              <CardDescription>
                Tag, registration number, breed, sire, dam, and EPDs for each head.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/seedstock/breeding">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Breeding</CardTitle>
              <CardDescription>
                AI, natural service, and embryo transfer tied to registered animals.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/seedstock/sales">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>
                Live animal, semen, and embryo sales — linked to customers and invoicing.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/seedstock/maternal">
          <Card className="h-full border-olive/40 transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Maternal intelligence</CardTitle>
              <CardDescription>
                Fertility scores, calving distribution, family performance, and lifetime value.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/seedstock/calving">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Calving</CardTitle>
              <CardDescription>
                Calving ease, assistance, and outcomes linked to registered dams.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/seedstock/exposure">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Exposure</CardTitle>
              <CardDescription>
                Natural service breeding windows by dam and bull.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/seedstock/weaning">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Weaning</CardTitle>
              <CardDescription>
                Weaning weights and replacement heifers — auto-registers retained females.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {canManage ? (
          <>
            <Link href="/seedstock/animals/new">
              <Button fullWidth size="lg">
                + Register animal
              </Button>
            </Link>
            <Link href="/seedstock/breeding/new">
              <Button variant="secondary" fullWidth size="lg">
                + Record breeding
              </Button>
            </Link>
          </>
        ) : null}
        <Link href="/seedstock/animals">
          <Button variant="secondary" fullWidth size="lg">
            View animals
          </Button>
        </Link>
        <Link href="/seedstock/breeding">
          <Button variant="secondary" fullWidth size="lg">
            View breeding
          </Button>
        </Link>
      </div>
    </div>
  );
}
