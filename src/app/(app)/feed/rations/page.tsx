import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listFeedRations } from "@/lib/feed/queries";
import { RationList } from "@/components/feed/ration-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Feed Rations — LAORS",
};

export default async function FeedRationsPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const rations = await listFeedRations(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/feed" className="text-sm font-medium text-olive hover:underline">
            ← Feed
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Feed rations</h1>
          <p className="text-charcoal/70">Named mixes with price per unit for billing</p>
        </div>
        <Link href="/feed/rations/new">
          <Button size="lg">+ Add</Button>
        </Link>
      </div>
      <RationList rations={rations} />
    </div>
  );
}
