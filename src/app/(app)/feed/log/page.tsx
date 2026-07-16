import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listFeedingRecords } from "@/lib/feed/queries";
import { FeedingList } from "@/components/feed/feeding-list";
import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Feed Log — LAORS",
};

export default async function FeedLogPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const records = await listFeedingRecords(orgId, { context: "general" });

  return (
    <AppPageShell>
      <AppPageHeader
        title="Feed Log"
        subtitle="Daily feed by location, herd, and owner."
        backHref="/feed"
        backLabel="Feed"
        actions={
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <ExportButtons orgId={orgId} recordType="feedings" size="sm" />
            <Link href="/feed/log/new">
              <Button size="md" fullWidth className="sm:w-auto">
                + Log
              </Button>
            </Link>
          </div>
        }
      />
      <FeedingList records={records} />
    </AppPageShell>
  );
}
