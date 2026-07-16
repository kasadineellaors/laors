import type { ReactNode } from "react";
import type { HealthSummary } from "@/lib/health/summary";
import type { MedicineItemRecord } from "@/lib/medicine/types";
import { AlertBanner } from "@/components/dashboard/alert-banner";

interface HealthAlertsProps {
  summary: HealthSummary;
  lowStockItems: MedicineItemRecord[];
}

export function HealthAlerts({ summary, lowStockItems }: HealthAlertsProps) {
  const alerts: Array<{
    key: string;
    variant: "warning" | "critical" | "info";
    content: ReactNode;
    href?: string;
    linkLabel?: string;
  }> = [];

  const outOfStock = lowStockItems.filter((i) => i.is_out_of_stock);
  if (outOfStock.length > 0) {
    alerts.push({
      key: "out-of-stock",
      variant: "critical",
      content: (
        <>
          <span className="font-medium">Out of stock:</span>{" "}
          {outOfStock.length === 1
            ? `${outOfStock[0].name} has no inventory on hand.`
            : `${outOfStock.length} medicines are out of stock.`}
        </>
      ),
      href: "/health/medicine",
      linkLabel: "View inventory",
    });
  } else if (summary.lowStockMedicines > 0) {
    const first = lowStockItems.find((i) => i.is_low_stock);
    alerts.push({
      key: "low-stock",
      variant: "warning",
      content: (
        <>
          <span className="font-medium">Low stock:</span>{" "}
          {first
            ? `${first.name} is at or below its reorder level.`
            : `${summary.lowStockMedicines} medicines are low on stock.`}
        </>
      ),
      href: "/health/medicine",
      linkLabel: "View inventory",
    });
  }

  if (summary.hasWithdrawalData && summary.activeWithdrawals > 0) {
    alerts.push({
      key: "withdrawals",
      variant: "warning",
      content: (
        <>
          <span className="font-medium">Active withdrawal:</span>{" "}
          {summary.activeWithdrawals} treatment
          {summary.activeWithdrawals === 1 ? "" : "s"} still under withdrawal.
        </>
      ),
      href: "/health/treatments",
      linkLabel: "View treatments",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertBanner
          key={alert.key}
          variant={alert.variant}
          href={alert.href}
          linkLabel={alert.linkLabel}
        >
          {alert.content}
        </AlertBanner>
      ))}
    </div>
  );
}
