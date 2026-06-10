import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getCalvingSummary, getCowSummary, listBulls } from "@/lib/cow-calf/queries";
import { getBreedingSummary } from "@/lib/cow-calf/breeding-queries";
import type { OperationMode } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Cow-Calf — LAORS",
};

export default async function CowCalfPage() {
  const session = await requireOnboardedUser();
  const org = session.organization!;
  const modes = (org.enabled_modes ?? []) as OperationMode[];

  if (!hasCowCalfMode(modes)) {
    redirect("/cattle");
  }

  const orgId = org.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const [summary, bulls, breedingSummary, cowSummary] = await Promise.all([
    getCalvingSummary(orgId),
    listBulls(orgId),
    getBreedingSummary(orgId),
    getCowSummary(orgId),
  ]);

  const activeBulls = bulls.filter((b) => b.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Cow-Calf</h1>
        <p className="text-charcoal/70">Calving, breeding, cows, feed, and bulls</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Calves this month", value: summary.thisMonth.toString() },
          { label: "Due in 30 days", value: breedingSummary.dueNext30Days.toString() },
          { label: "Registered cows", value: cowSummary.active.toString() },
          { label: "Active bulls", value: activeBulls.toString() },
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
        <Link href="/cow-calf/calving">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Calving</CardTitle>
              <CardDescription>
                Log births, dam/calf tags, and add live calves to herd inventory.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/cow-calf/breeding">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Breeding</CardTitle>
              <CardDescription>
                Service dates, pregnancy checks, and expected calving dates.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/cow-calf/cows">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Cows & heifers</CardTitle>
              <CardDescription>
                Individual tags, pasture assignment, and status tracking.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/cow-calf/bulls">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Bulls</CardTitle>
              <CardDescription>
                Individual bull tags, pasture assignment, and status.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/cow-calf/feed">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Feed</CardTitle>
              <CardDescription>
                Hay, supplement, and mineral by pasture — for pairs and cow herds.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/cow-calf/calving/new">
          <Button fullWidth size="lg">
            + Log calving
          </Button>
        </Link>
        <Link href="/cow-calf/breeding/new">
          <Button variant="secondary" fullWidth size="lg">
            + Record breeding
          </Button>
        </Link>
        <Link href="/cow-calf/feed/new">
          <Button variant="secondary" fullWidth size="lg">
            + Log feed
          </Button>
        </Link>
        {canManage ? (
          <>
            <Link href="/cow-calf/cows/new">
              <Button variant="secondary" fullWidth size="lg">
                + Register cow
              </Button>
            </Link>
            <Link href="/cow-calf/bulls/new">
              <Button variant="secondary" fullWidth size="lg">
                + Register bull
              </Button>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
