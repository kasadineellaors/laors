import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { FeedItemForm } from "@/components/feed/feed-item-form";

export const metadata: Metadata = {
  title: "Add Feedstuff — LAORS",
};

export default async function NewFeedItemPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/feed/inventory" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Feed inventory
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Add feedstuff</h1>
      </div>
      <FeedItemForm orgId={orgId} />
    </div>
  );
}
