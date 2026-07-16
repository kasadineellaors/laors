import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listFeedRations } from "@/lib/feed/queries";
import { RationList } from "@/components/feed/ration-list";
import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Feed Rations — LAORS",
};

export default async function FeedRationsPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const rations = await listFeedRations(orgId);

  return (
    <AppPageShell>
      <AppPageHeader
        title="Feed Rations"
        subtitle="Named mixes with price per unit for billing."
        backHref="/feed"
        backLabel="Feed"
        actions={
          <Link href="/feed/rations/new">
            <Button size="md" fullWidth className="sm:w-auto">
              + Add
            </Button>
          </Link>
        }
      />
      <RationList rations={rations} />
    </AppPageShell>
  );
}
