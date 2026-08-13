import type { Metadata } from "next";
import Link from "next/link";
import { requireFeedyardEnterprise } from "@/lib/feedyard/enterprise-guard";
import { listCattleGroups } from "@/lib/inventory/queries";
import { QuickActionGroup } from "@/components/dashboard/quick-action-group";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Feedyard — LAORS",
};

export default async function FeedyardPage() {
  const session = await requireFeedyardEnterprise();
  const orgId = session.organization!.id;
  const groups = await listCattleGroups(orgId, undefined, { active: true });
  const feedyardLots = groups.filter(
    (g) => g.enterprise_type === "custom_fed" || g.enterprise_type === "stocker",
  );
  const activeHead = feedyardLots.reduce((sum, g) => sum + g.total_head, 0);

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Feedyard"
        subtitle="Custom feeding and yardage billing — separate from pasture cow-calf accounting."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{feedyardLots.length}</CardTitle>
            <CardDescription>Active lots on feed</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{activeHead.toLocaleString()}</CardTitle>
            <CardDescription>Current head in feedyard lots</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Yardage billing</CardTitle>
            <CardDescription>Head-days, feed, medicine, processing, misc</CardDescription>
          </CardHeader>
          <Link href="/reports/owner-totals">
            <Button fullWidth variant="outline">
              Owner Totals
            </Button>
          </Link>
        </Card>
      </div>

      <QuickActionGroup
        title="Feedyard operations"
        actions={[
          { label: "Receive cattle", href: "/cattle/new", variant: "primary" },
          { label: "Log feed delivery", href: "/feed/log/new" },
          { label: "Record treatment", href: "/health/treatments/new" },
          { label: "Move cattle", href: "/cattle/move" },
          { label: "Record death loss", href: "/cattle" },
          { label: "Misc charge", href: "/reports/owner-totals" },
          { label: "Generate invoice", href: "/invoices/generate" },
          { label: "Manage rations", href: "/feed/rations" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lots on feed</CardTitle>
          <CardDescription>Stocker and custom-fed lots — pasture billing stays on cow-calf.</CardDescription>
        </CardHeader>
        {feedyardLots.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-text-secondary">No active lots yet.</p>
        ) : (
          <ul className="divide-y divide-border-neutral">
            {feedyardLots.slice(0, 12).map((lot) => (
              <li key={lot.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{lot.name}</p>
                  <p className="text-text-secondary">
                    {lot.total_head} head
                    {lot.owner_name ? ` · ${lot.owner_name}` : ""}
                    {lot.location_name ? ` · ${lot.location_name}` : ""}
                  </p>
                </div>
                <Link href={`/cattle/groups/${lot.id}`} className="text-brown hover:underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
