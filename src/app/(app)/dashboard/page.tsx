import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  getLocationTreeWithRollups,
  getRanchTotalHeadCount,
} from "@/lib/locations/rollups";
import { countOpenTasks } from "@/lib/tasks/queries";
import { countLowStockItems } from "@/lib/medicine/queries";
import { getSalesSummary } from "@/lib/sales/queries";
import { getInvoiceSummary } from "@/lib/invoices/queries";
import { getRainfallSummary } from "@/lib/weather/queries";
import { canManageInvoices, canManageTeam, canWriteInventory } from "@/lib/auth/roles";
import { DbSetupBanner } from "@/components/app/db-setup-banner";
import { GettingStartedChecklist } from "@/components/dashboard/getting-started-checklist";
import { getDbSetupIssues } from "@/lib/system/db-status";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OPERATION_MODE_LABELS, type OperationMode } from "@/types/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — LAORS",
};

export default async function DashboardPage() {
  const session = await requireOnboardedUser();
  const org = session.organization!;
  const orgId = org.id;
  const modes = (org.enabled_modes ?? []) as OperationMode[];
  const showInvoices = canManageInvoices(session.membership?.system_role);
  const role = session.membership?.system_role;

  const [totalHead, tree, openTasks, lowStock, salesSummary, rainfall, invoiceSummary, dbIssues] =
    await Promise.all([
    getRanchTotalHeadCount(orgId),
    getLocationTreeWithRollups(orgId),
    countOpenTasks(orgId),
    countLowStockItems(orgId),
    getSalesSummary(orgId),
    getRainfallSummary(orgId),
    showInvoices ? getInvoiceSummary(orgId) : Promise.resolve({ openCount: 0, unpaidTotal: 0 }),
    getDbSetupIssues(),
  ]);

  const propertyCount = tree.length;
  const overCapacity = tree.some((n) => (n.capacity_percent ?? 0) > 100);
  const alertCount = (overCapacity ? 1 : 0) + lowStock;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">{org.name}</h1>
        <p className="text-charcoal/70">Your digital foreman is ready.</p>
      </div>

      <DbSetupBanner issues={dbIssues} />

      <GettingStartedChecklist
        totalHead={totalHead}
        hasLocations={propertyCount > 0}
        canManageTeam={canManageTeam(role)}
        canWriteInventory={canWriteInventory(role)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Head count", value: totalHead.toString() },
          { label: "Properties", value: propertyCount.toString() },
          { label: "Open tasks", value: openTasks.toString() },
          { label: "Alerts", value: alertCount.toString() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-surface px-3 py-4 text-center"
          >
            <p className="text-2xl font-bold text-olive">{stat.value}</p>
            <p className="text-xs text-charcoal/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {lowStock > 0 ? (
        <div className="rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust">
          {lowStock} medicine item{lowStock === 1 ? "" : "s"} low on stock.{" "}
          <Link href="/health/medicine" className="font-semibold underline">
            Check inventory
          </Link>
          .
        </div>
      ) : null}

      {overCapacity ? (
        <div className="rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust">
          One or more locations are over capacity. Check your{" "}
          <Link href="/setup/locations" className="font-semibold underline">
            ranch map
          </Link>
          .
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Clock In/Out", href: "/time" },
          { label: "Log Treatment", href: "/health/treatments/new" },
          { label: "Move Cattle", href: "/cattle/move" },
          { label: "New Task", href: "/jobs/new" },
          { label: "Record Sale", href: "/sales/new" },
          { label: "Rainfall", href: "/weather/rainfall/new" },
          ...(showInvoices
            ? [
                { label: "Generate Invoice", href: "/invoices/generate" } as const,
                { label: "New Invoice", href: "/invoices/new" } as const,
              ]
            : []),
        ].map((action) =>
          action.href ? (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" size="lg" fullWidth>
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button key={action.label} variant="outline" size="lg" fullWidth disabled>
              {action.label}
            </Button>
          ),
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Operation modes</CardTitle>
            <CardDescription>Active on this ranch</CardDescription>
          </CardHeader>
          <ul className="space-y-2">
            {modes.length === 0 ? (
              <li className="text-sm text-charcoal/60">No modes selected</li>
            ) : (
              modes.map((mode) => (
                <li
                  key={mode}
                  className="rounded-lg bg-olive/10 px-3 py-2 text-sm font-semibold text-olive"
                >
                  {OPERATION_MODE_LABELS[mode] ?? mode}
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last 30 days</CardTitle>
            <CardDescription>Rainfall and sales at a glance</CardDescription>
          </CardHeader>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between rounded-lg bg-cream px-3 py-2">
              <span className="text-charcoal/70">Rainfall</span>
              <span className="font-semibold text-olive">{rainfall.totalLast30Days}&quot;</span>
            </li>
            <li className="flex justify-between rounded-lg bg-cream px-3 py-2">
              <span className="text-charcoal/70">Head sold</span>
              <span className="font-semibold text-olive">{salesSummary.totalHeadSoldLast30Days}</span>
            </li>
            <li className="flex justify-between rounded-lg bg-cream px-3 py-2">
              <span className="text-charcoal/70">Sales revenue</span>
              <span className="font-semibold text-olive">
                {salesSummary.totalRevenueLast30Days.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </li>
            {showInvoices ? (
              <>
                <li className="flex justify-between rounded-lg bg-cream px-3 py-2">
                  <span className="text-charcoal/70">Open invoices</span>
                  <span className="font-semibold text-olive">{invoiceSummary.openCount}</span>
                </li>
                <li className="flex justify-between rounded-lg bg-cream px-3 py-2">
                  <span className="text-charcoal/70">Outstanding</span>
                  <span className="font-semibold text-olive">
                    {invoiceSummary.unpaidTotal.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </li>
              </>
            ) : null}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/weather/rainfall">
              <Button variant="secondary" fullWidth size="sm">
                Rainfall
              </Button>
            </Link>
            <Link href="/sales">
              <Button variant="secondary" fullWidth size="sm">
                Sales
              </Button>
            </Link>
            {showInvoices ? (
              <Link href="/invoices" className="col-span-2">
                <Button variant="secondary" fullWidth size="sm">
                  Invoices
                </Button>
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
