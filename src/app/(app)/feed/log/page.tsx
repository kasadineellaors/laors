import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listFeedingRecords } from "@/lib/feed/queries";
import { FeedingList } from "@/components/feed/feeding-list";
import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Feed Log — LAORS",
};

export default async function FeedLogPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const records = await listFeedingRecords(orgId, { context: "general" });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/feed" className="text-sm font-medium text-olive hover:underline">
            ← Feed
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Feed log</h1>
          <p className="text-charcoal/70">Daily feed by location, herd, and owner</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <ExportButtons orgId={orgId} recordType="feedings" size="sm" />
          <Link href="/feed/log/new">
            <Button size="lg">+ Log</Button>
          </Link>
        </div>
      </div>
      <FeedingList records={records} />
    </div>
  );
}
