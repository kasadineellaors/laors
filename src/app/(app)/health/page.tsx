import { requireOnboardedUser } from "@/lib/auth/session";
import { getHealthSummary } from "@/lib/health/summary";
import { listMedicineItems } from "@/lib/medicine/queries";
import { FeedModuleCard } from "@/components/feed/feed-module-card";
import { HealthPageHeader } from "@/components/health/health-page-header";
import { HealthSummaryMetrics } from "@/components/health/health-summary-metrics";
import { HealthAlerts } from "@/components/health/health-alerts";

export default async function HealthPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [summary, items] = await Promise.all([getHealthSummary(orgId), listMedicineItems(orgId)]);

  const lowStockItems = items.filter((i) => i.is_low_stock || i.is_out_of_stock);

  const treatmentsMetric = [
    `${summary.treatmentsThisMonth} this month`,
    `${summary.headTreatedThisMonth.toLocaleString()} head treated`,
  ].join(" · ");

  const withdrawalMetric =
    summary.hasWithdrawalData && summary.activeWithdrawals > 0
      ? `${summary.activeWithdrawals} active withdrawal${summary.activeWithdrawals === 1 ? "" : "s"}`
      : null;

  const treatmentsCardMetric = withdrawalMetric
    ? `${treatmentsMetric} · ${withdrawalMetric}`
    : treatmentsMetric;

  const inventoryParts = [`${summary.medicineProducts} active`];
  if (summary.lowStockMedicines > 0) {
    inventoryParts.push(`${summary.lowStockMedicines} low stock`);
  }
  if (summary.outOfStockMedicines > 0) {
    inventoryParts.push(`${summary.outOfStockMedicines} out of stock`);
  }

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col gap-6 pb-4">
      <HealthPageHeader />

      <HealthAlerts summary={summary} lowStockItems={lowStockItems} />

      <HealthSummaryMetrics
        treatmentsThisMonth={summary.treatmentsThisMonth}
        headTreatedThisMonth={summary.headTreatedThisMonth}
        activeWithdrawals={summary.activeWithdrawals}
        lowStockMedicines={summary.lowStockMedicines}
        hasWithdrawalData={summary.hasWithdrawalData}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FeedModuleCard
          href="/health/treatments"
          title="Treatments"
          description="Review cattle health records, products used, withdrawals, and follow-ups."
          metric={treatmentsCardMetric}
          actionLabel="View treatments"
        />
        <FeedModuleCard
          href="/health/medicine"
          title="Medicine Inventory"
          description="Track medicine on hand, costs, stock alerts, and expiration dates."
          metric={inventoryParts.join(" · ")}
          actionLabel="View inventory"
        />
      </div>
    </div>
  );
}
