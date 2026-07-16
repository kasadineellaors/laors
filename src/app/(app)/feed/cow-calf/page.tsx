import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getFeedingSummary, listFeedingRecords } from "@/lib/feed/queries";
import { FeedingList } from "@/components/feed/feeding-list";
import { linkButtonClassName } from "@/components/ui/button";
import { AppPageShell } from "@/components/layout/app-page-shell";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Cow-Calf Feed — LAORS",
};

export default async function CowCalfFeedPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/feed");

  const orgId = session.organization!.id;
  const [records, summary] = await Promise.all([
    listFeedingRecords(orgId, { context: "cow_calf" }),
    getFeedingSummary(orgId, "cow_calf"),
  ]);

  return (
    <AppPageShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/feed" className="text-sm font-medium text-brown hover:underline">
              ← Feed
            </Link>
            <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
              Cow-calf feed
            </h1>
            <p className="text-text-secondary">
              {summary.thisMonth} this month · {summary.last7Days} in last 7 days
            </p>
          </div>
          <Link
            href="/feed/cow-calf/new"
            className={linkButtonClassName({ variant: "outline", size: "lg" })}
          >
            + Log
          </Link>
        </div>

        <p className="text-sm text-text-secondary">
          Hay, supplement, and mineral for pairs and pastures — separate from stocker/custom-feed
          billing.{" "}
          <Link href="/feed/rations" className="font-medium text-brown hover:underline">
            Manage rations
          </Link>
        </p>

        <FeedingList
          records={records}
          detailBasePath="/feed/cow-calf"
          newFeedingPath="/feed/cow-calf/new"
          emptyMessage="No cow-calf feed logged yet — log hay or supplement by location."
        />
      </div>
    </AppPageShell>
  );
}
