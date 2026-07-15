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
        <Link href="/feed/inventory" className="text-sm font-medium text-olive hover:underline">
          ← Feed inventory
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Add feedstuff</h1>
      </div>
      <FeedItemForm orgId={orgId} />
    </div>
  );
}
