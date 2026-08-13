import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listOwners } from "@/lib/owners/queries";
import { currentMonthKey } from "@/lib/reports/monthly";
import { HeadDaysReportClient } from "@/components/reports/head-days-report-client";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Head-days — LAORS",
};

function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default async function HeadDaysReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const { month: monthParam } = await searchParams;
  const month = monthParam?.match(/^\d{4}-\d{2}$/) ? monthParam : currentMonthKey();
  const { start, end } = monthBounds(month);

  const owners = await listOwners(orgId);

  return (
    <AppPageShell>
      <Link
        href="/reports"
        className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
      >
        ← Reports
      </Link>
      <AppPageHeader
        className="mt-2"
        title="Head-days"
        subtitle="Per lot, pen, and pasture/yardage — inventory integration, not billing."
      />
      <HeadDaysReportClient
        orgId={orgId}
        ownerOptions={owners}
        initialPeriodStart={start}
        initialPeriodEnd={end}
      />
    </AppPageShell>
  );
}
