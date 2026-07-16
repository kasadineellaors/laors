import type { FeedItemRecord } from "@/lib/feed/inventory-types";
import { AlertBanner } from "@/components/dashboard/alert-banner";

interface FeedLowStockAlertProps {
  items: FeedItemRecord[];
}

export function FeedLowStockAlert({ items }: FeedLowStockAlertProps) {
  const lowStock = items.filter((i) => i.is_low_stock);
  if (lowStock.length === 0) return null;

  const message =
    lowStock.length === 1
      ? (() => {
          const item = lowStock[0];
          const projection =
            item.projected_days_remaining != null
              ? ` About ${item.projected_days_remaining} day${item.projected_days_remaining === 1 ? "" : "s"} of use remain at recent feeding rates.`
              : "";
          return `${item.name} is below its minimum stock level.${projection}`;
        })()
      : `${lowStock.length} feedstuffs are below their minimum stock levels.`;

  return (
    <AlertBanner href="/feed/inventory" linkLabel="View inventory" variant="warning">
      <span className="font-medium">Low stock:</span> {message}
    </AlertBanner>
  );
}
