import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listFeedRations, listFeedingRecords } from "@/lib/feed/queries";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Feed — LAORS",
};

export default async function FeedPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [rations, recentFeedings] = await Promise.all([
    listFeedRations(orgId),
    listFeedingRecords(orgId, { limit: 5, context: "general" }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Feed</h1>
        <p className="text-charcoal/70">Rations, daily feed log, and stocker billing</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface px-3 py-4 text-center">
          <p className="text-2xl font-bold text-olive">{rations.length}</p>
          <p className="text-xs text-charcoal/60">Active rations</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-3 py-4 text-center">
          <p className="text-2xl font-bold text-olive">{recentFeedings.length}</p>
          <p className="text-xs text-charcoal/60">Recent feedings</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/feed/log">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Feed log</CardTitle>
              <CardDescription>
                Log feed by pen, lot, or pasture — herd, owner, amount, and who fed.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/feed/rations">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Rations</CardTitle>
              <CardDescription>
                Create feed mixes with units and prices for automatic invoicing.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/feed/log/new">
          <Button fullWidth size="lg">
            + Log feeding
          </Button>
        </Link>
        <Link href="/feed/rations/new">
          <Button variant="secondary" fullWidth size="lg">
            + New ration
          </Button>
        </Link>
      </div>
    </div>
  );
}
