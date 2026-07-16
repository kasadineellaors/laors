import { EmptyState } from "@/components/ui/empty-state";

export function DashboardEmptyLots() {
  return (
    <EmptyState
      title="No open Stocker lots"
      description="Receive cattle to create the first active lot and unlock ranch-wide KPIs on this page."
      actionHref="/cattle/new"
      actionLabel="+ Receive cattle"
      secondaryHref="/cattle"
      secondaryLabel="View lots"
    />
  );
}
