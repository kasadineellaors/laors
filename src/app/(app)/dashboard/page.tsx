import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  getLocationTreeWithRollups,
  getRanchTotalHeadCount,
} from "@/lib/locations/rollups";
import { countOpenTasks } from "@/lib/tasks/queries";
import { countLowStockItems } from "@/lib/medicine/queries";
import { countLowStockFeedItems } from "@/lib/feed/inventory-queries";
import { getSalesSummary } from "@/lib/sales/queries";
import { getInvoiceSummary } from "@/lib/invoices/queries";
import { getRainfallSummary } from "@/lib/weather/queries";
import { canManageInvoices, canManageTeam, canWriteInventory } from "@/lib/auth/roles";
import { DbSetupBanner } from "@/components/app/db-setup-banner";
import { GettingStartedChecklist } from "@/components/dashboard/getting-started-checklist";
import { getDashboardCommandCenter } from "@/lib/dashboard/queries";
import { getDbSetupIssues } from "@/lib/system/db-status";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getEnterpriseInventorySummary } from "@/lib/cow-calf/herd-queries";
import { showEnterpriseSwitcher } from "@/lib/enterprise/ui";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { getCalvingSummary } from "@/lib/cow-calf/queries";
import { isCalendarEnabled } from "@/lib/org/settings";
import { listAuditLog } from "@/lib/audit/queries";
import type { OperationMode } from "@/types/auth";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { ForemanSummary, type ForemanSummaryItem } from "@/components/dashboard/foreman-summary";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { listOwners } from "@/lib/owners/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { listFeedRationOptions } from "@/lib/feed/queries";
import { getRationUnitPrices } from "@/lib/feed/inventory-queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { listMedicineOptions } from "@/lib/medicine/queries";
import { listOwnerOptions } from "@/lib/owners/queries";
import { toFeedGroupOptions, rationCostsToRecord, ownersToSelectOptions } from "@/lib/feed/options";
import { EnterpriseSummaryCard } from "@/components/dashboard/enterprise-summary-card";
import { FinancialSnapshotCard } from "@/components/dashboard/financial-snapshot-card";
import { MonthlyPlCard } from "@/components/dashboard/monthly-pl-card";
import { HeadByEnterpriseCard } from "@/components/dashboard/head-by-enterprise-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { OperationalAlerts } from "@/components/dashboard/operational-alerts";
import { LotAdgCard } from "@/components/dashboard/lot-adg-card";
import { DashboardEmptyLots } from "@/components/dashboard/dashboard-empty-lots";
import { formatAdgLbs } from "@/lib/inventory/adg";
import { RanchEnterpriseHub } from "@/components/dashboard/ranch-enterprise-hub";

export const metadata: Metadata = {
  title: "Dashboard — LAORS",
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function buildForemanSummary(input: {
  lowMedicine: number;
  lowFeed: number;
  openTasks: number;
  showInvoices: boolean;
  openInvoices: number;
  unpaidTotal: number;
  headOnFeed: number;
  overCapacity: boolean;
  attentionLotCount: number;
}): ForemanSummaryItem[] {
  const items: ForemanSummaryItem[] = [];

  if (input.lowMedicine > 0) {
    items.push({
      id: "low-medicine",
      message: `${input.lowMedicine} medicine item${input.lowMedicine === 1 ? "" : "s"} ${input.lowMedicine === 1 ? "is" : "are"} low on stock.`,
      href: "/health/medicine",
      linkLabel: "View details",
      tone: "warning",
    });
  }

  if (input.lowFeed > 0) {
    items.push({
      id: "low-feed",
      message: `${input.lowFeed} feedstuff item${input.lowFeed === 1 ? "" : "s"} ${input.lowFeed === 1 ? "is" : "are"} low on stock.`,
      href: "/feed/inventory",
      linkLabel: "View details",
      tone: "warning",
    });
  }

  if (input.openTasks > 0) {
    items.push({
      id: "open-tasks",
      message: `${input.openTasks} task${input.openTasks === 1 ? "" : "s"} ${input.openTasks === 1 ? "is" : "are"} open.`,
      href: "/jobs",
      linkLabel: "View tasks",
    });
  }

  if (input.showInvoices && input.openInvoices > 0) {
    items.push({
      id: "open-invoices",
      message: `${input.openInvoices} invoice${input.openInvoices === 1 ? "" : "s"} remain open.`,
      href: "/invoices",
      linkLabel: "View invoices",
    });
  }

  if (input.showInvoices && input.unpaidTotal > 0) {
    items.push({
      id: "outstanding",
      message: `${money(input.unpaidTotal)} is outstanding.`,
      href: "/invoices",
      linkLabel: "View invoices",
      tone: "warning",
    });
  }

  if (input.headOnFeed > 0) {
    items.push({
      id: "head-on-feed",
      message: `${input.headOnFeed.toLocaleString()} head are currently on feed.`,
      href: "/feed/log",
      linkLabel: "View feed log",
    });
  }

  if (input.overCapacity) {
    items.push({
      id: "over-capacity",
      message: "One or more locations are over capacity.",
      href: "/setup/locations",
      linkLabel: "Properties & Locations",
      tone: "warning",
    });
  }

  if (input.attentionLotCount > 0) {
    items.push({
      id: "attention-lots",
      message: `${input.attentionLotCount} lot${input.attentionLotCount === 1 ? "" : "s"} need attention.`,
      href: "/cattle",
      linkLabel: "View lots",
      tone: "warning",
    });
  }

  return items;
}

export default async function DashboardPage() {
  const session = await requireOnboardedUser();
  const org = session.organization!;
  const orgId = org.id;
  const modes = (org.enabled_modes ?? []) as OperationMode[];
  const showInvoices = canManageInvoices(session.membership?.system_role);
  const role = session.membership?.system_role;

  const showCowCalf = hasCowCalfMode(modes);
  const showDualEnterprise = showEnterpriseSwitcher(modes);
  const showSeedstock = hasSeedstockMode(modes);
  const showCalendar = isCalendarEnabled(org);

  const canManageOwners = canManageInvoices(role);
  const userId = session.user.id;

  const [
    totalHead,
    tree,
    openTasks,
    lowMedicine,
    lowFeed,
    salesSummary,
    rainfall,
    invoiceSummary,
    dbIssues,
    calvingSummary,
    commandCenter,
    recentActivity,
    cowCalfInventory,
    owners,
    cattleGroups,
    pickerLocations,
    feedGroupOptions,
    orgMembers,
    medicineOptions,
    taskCategories,
    rationOptions,
    feedingOwnerOptions,
  ] = await Promise.all([
    getRanchTotalHeadCount(orgId),
    getLocationTreeWithRollups(orgId),
    countOpenTasks(orgId),
    countLowStockItems(orgId),
    countLowStockFeedItems(orgId),
    getSalesSummary(orgId),
    getRainfallSummary(orgId),
    showInvoices ? getInvoiceSummary(orgId) : Promise.resolve({ openCount: 0, unpaidTotal: 0 }),
    getDbSetupIssues(),
    showCowCalf ? getCalvingSummary(orgId) : Promise.resolve({ total: 0, live: 0, thisMonth: 0 }),
    getDashboardCommandCenter(orgId),
    listAuditLog(orgId, 5),
    showDualEnterprise ? getEnterpriseInventorySummary(orgId) : Promise.resolve(null),
    canManageOwners ? listOwners(orgId) : Promise.resolve([]),
    listCattleGroups(orgId),
    getTreePickerOptions(orgId),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOrgMembers(orgId),
    listMedicineOptions(orgId),
    getRanchOptions(orgId, "task_categories"),
    listFeedRationOptions(orgId),
    listOwnerOptions(orgId).then(ownersToSelectOptions),
  ]);

  const rationUnitCosts = rationCostsToRecord(
    await getRationUnitPrices(orgId, rationOptions.map((r) => r.id)),
  );

  const propertyCount = tree.length;
  const lowStock = lowMedicine + lowFeed;
  const overCapacity = tree.some((n) => (n.capacity_percent ?? 0) > 100);
  const alertCount = (overCapacity ? 1 : 0) + lowStock;

  const hasLots = commandCenter.active_lots > 0 || commandCenter.closed_lots > 0;

  const foremanItems = buildForemanSummary({
    lowMedicine,
    lowFeed: commandCenter.low_feed_items.length > 0 ? 0 : lowFeed,
    openTasks,
    showInvoices,
    openInvoices: invoiceSummary.openCount,
    unpaidTotal: invoiceSummary.unpaidTotal,
    headOnFeed: commandCenter.total_open_head,
    overCapacity,
    attentionLotCount: commandCenter.attention_lots.length,
  });

  const fourthMetric = showInvoices
    ? {
        label: "Outstanding receivables",
        value: money(invoiceSummary.unpaidTotal),
        context: `${invoiceSummary.openCount} open invoice${invoiceSummary.openCount === 1 ? "" : "s"}`,
        tone: invoiceSummary.unpaidTotal > 0 ? ("warning" as const) : ("default" as const),
      }
    : {
        label: "Properties",
        value: String(propertyCount),
        context: `${totalHead.toLocaleString()} total head`,
        tone: "default" as const,
      };

  const lotOptions = cattleGroups.map((g) => ({ id: g.id, name: g.name }));
  const locationOptions = pickerLocations.flatMap(function flatten(
    node: (typeof pickerLocations)[number],
  ): Array<{ id: string; label: string }> {
    const self = [{ id: node.id, label: node.name }];
    const kids = (node.children ?? []).flatMap(flatten);
    return [...self, ...kids];
  });

  return (
    <div className="space-y-8">
      <DashboardGreeting fullName={session.profile?.full_name} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <DashboardMetricCard
          label="Head on feed"
          value={commandCenter.total_open_head.toLocaleString()}
          context={hasLots ? `${commandCenter.active_lots} active lots` : undefined}
        />
        <DashboardMetricCard
          label="Ranch ADG"
          value={formatAdgLbs(commandCenter.operation_adg_lbs)}
          context={
            commandCenter.operation_adg_lot_count > 0
              ? `${commandCenter.operation_adg_lot_count} lot${commandCenter.operation_adg_lot_count === 1 ? "" : "s"} tracked`
              : "Need weight in + current wt"
          }
          tone={
            commandCenter.operation_adg_lbs != null && commandCenter.operation_adg_lbs < 0
              ? "warning"
              : "default"
          }
        />
        <DashboardMetricCard
          label="Death loss"
          value={
            commandCenter.death_loss_placed_head > 0
              ? `${commandCenter.death_loss_pct}%`
              : "—"
          }
          context={
            commandCenter.death_loss_placed_head > 0
              ? `${commandCenter.death_loss_deaths} dead · ${commandCenter.deaths_this_month} this month`
              : "No placed head on open lots"
          }
          tone={
            commandCenter.death_loss_pct >= 3
              ? "critical"
              : commandCenter.death_loss_pct >= 1.5
                ? "warning"
                : "default"
          }
        />
        <DashboardMetricCard
          label="Open tasks"
          value={String(openTasks)}
          tone={openTasks > 0 ? "warning" : "default"}
        />
        <DashboardMetricCard
          label="Alerts"
          value={String(alertCount)}
          tone={alertCount > 0 ? "warning" : "default"}
        />
        <DashboardMetricCard
          label={fourthMetric.label}
          value={fourthMetric.value}
          context={fourthMetric.context}
          tone={fourthMetric.tone}
        />
      </div>

      <ForemanSummary items={foremanItems} />

      {showDualEnterprise ? (
        <RanchEnterpriseHub
          stocker={{
            activeLots: commandCenter.active_lots,
            headOnFeed: commandCenter.total_open_head,
            attentionLots: commandCenter.attention_lots.length,
            openInvoices: showInvoices ? invoiceSummary.openCount : undefined,
          }}
          cowCalf={
            cowCalfInventory
              ? {
                  herdCount: cowCalfInventory.herdCount,
                  pairs: cowCalfInventory.pairs,
                  calvesAtSide: cowCalfInventory.calvesAtSide,
                  calvesThisMonth: calvingSummary.thisMonth,
                }
              : undefined
          }
        />
      ) : null}

      <DbSetupBanner issues={dbIssues} />

      <GettingStartedChecklist
        totalHead={totalHead}
        hasLocations={propertyCount > 0}
        canManageTeam={canManageTeam(role)}
        canWriteInventory={canWriteInventory(role)}
      />

      <section className="space-y-3" aria-label="Alerts">
        {lowMedicine > 0 ? (
          <AlertBanner href="/health/medicine" linkLabel="Check medicine" variant="warning">
            {lowMedicine} medicine item{lowMedicine === 1 ? "" : "s"} low on stock
          </AlertBanner>
        ) : null}

        {lowFeed > 0 && commandCenter.low_feed_items.length === 0 ? (
          <AlertBanner href="/feed/inventory" linkLabel="Check feed inventory" variant="warning">
            {lowFeed} feedstuff item{lowFeed === 1 ? "" : "s"} low on stock
          </AlertBanner>
        ) : null}

        {overCapacity ? (
          <AlertBanner href="/setup/locations" linkLabel="View properties" variant="warning">
            One or more locations are over capacity
          </AlertBanner>
        ) : null}
      </section>

      <DashboardQuickActions
        orgId={orgId}
        currentUserId={userId}
        showCowCalf={showCowCalf}
        showSeedstock={showSeedstock}
        showCalendar={showCalendar}
        showInvoices={showInvoices}
        showMiscCharge={canManageOwners}
        locationTree={pickerLocations}
        groupOptions={feedGroupOptions}
        memberOptions={orgMembers}
        medicineOptions={medicineOptions}
        taskCategoryOptions={taskCategories}
        rationOptions={rationOptions}
        rationUnitCosts={rationUnitCosts}
        feedingOwnerOptions={feedingOwnerOptions}
        ownerOptions={owners}
        lotOptions={lotOptions}
        locationOptions={locationOptions}
      />

      {!hasLots ? (
        <DashboardEmptyLots />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <EnterpriseSummaryCard enterprises={commandCenter.head_by_enterprise} />
          <FinancialSnapshotCard
            rainfall={rainfall.totalLast30Days}
            headSold={salesSummary.totalHeadSoldLast30Days}
            salesRevenue={salesSummary.totalRevenueLast30Days}
            openInvoices={invoiceSummary.openCount}
            outstanding={invoiceSummary.unpaidTotal}
            showInvoices={showInvoices}
          />
        </div>
      )}

      {hasLots ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <MonthlyPlCard
            monthLabel={commandCenter.month_label}
            saleRevenue={commandCenter.sale_revenue}
            operatingCosts={commandCenter.operating_costs}
            netPl={commandCenter.net_operating_pl}
            headReceived={commandCenter.lots_received_this_month}
            headSold={commandCenter.head_sold_this_month}
          />
          <HeadByEnterpriseCard rows={commandCenter.head_by_enterprise} />
        </div>
      ) : null}

      {hasLots && commandCenter.lot_adg_rows.length > 0 ? (
        <LotAdgCard
          operationAdgLbs={commandCenter.operation_adg_lbs}
          rows={commandCenter.lot_adg_rows}
        />
      ) : null}

      {showCowCalf && calvingSummary.thisMonth > 0 ? (
        <AlertBanner href="/cow-calf/calving" linkLabel="View calving" variant="info">
          <span className="font-semibold">Cow-Calf</span> — {calvingSummary.thisMonth} calf
          {calvingSummary.thisMonth === 1 ? "" : "ves"} logged this month
        </AlertBanner>
      ) : null}

      <OperationalAlerts
        attentionLots={commandCenter.attention_lots}
        lowFeedItems={commandCenter.low_feed_items}
      />

      <RecentActivityCard entries={recentActivity} />
    </div>
  );
}
