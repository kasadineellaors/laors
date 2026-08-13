import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Reports — LAORS",
};

export default async function ReportsPage() {
  await requireOnboardedUser();

  return (
    <AppPageShell>
      <AppPageHeader
        title="Reports"
        subtitle="Owner totals, monthly operations, ranch P&L, and enterprise profit views."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-2 border-navy/20 sm:col-span-2">
          <CardHeader>
            <CardTitle>Owner Totals</CardTitle>
            <CardDescription>
              Primary owner-level reporting — current head, expenses, death loss, and head-days with
              drill-down from owner to lot to location.
            </CardDescription>
          </CardHeader>
          <Link href="/reports/owner-totals">
            <Button fullWidth size="lg">
              Owner Totals
            </Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operation P&amp;L</CardTitle>
            <CardDescription>
              Ranch-wide revenue vs costs for any month — purchases, feed, medicine, processing,
              and sales.
            </CardDescription>
          </CardHeader>
          <Link href="/reports/pl">
            <Button fullWidth size="lg">
              Monthly P&amp;L
            </Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>
              Feed, sales, purchases, expenses, and head movement for the current month.
            </CardDescription>
          </CardHeader>
          <Link href="/reports/monthly">
            <Button fullWidth size="lg" variant="secondary">
              Monthly operations
            </Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Head-days</CardTitle>
            <CardDescription>
              Per lot, pen, and pasture vs yardage for any date range — operational data, not
              invoicing.
            </CardDescription>
          </CardHeader>
          <Link href="/reports/head-days">
            <Button fullWidth size="lg" variant="outline">
              Head-days report
            </Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By enterprise</CardTitle>
            <CardDescription>Stocker, cow-calf, custom-fed — all time or by month.</CardDescription>
          </CardHeader>
          <Link href="/reports/enterprise">
            <Button fullWidth size="lg" variant="outline">
              Enterprise P&amp;L
            </Button>
          </Link>
        </Card>
      </div>
    </AppPageShell>
  );
}
