import { getOperationPlSummary } from "./operations-pl";
import { currentMonthKey } from "./period";
import type { MonthlyOperationsSummary } from "./types";

export { currentMonthKey, shiftMonth, formatShortMonth } from "./period";

export async function getMonthlyOperationsSummary(
  orgId: string,
  month = currentMonthKey(),
): Promise<MonthlyOperationsSummary> {
  const pl = await getOperationPlSummary(orgId, month);
  return {
    month: pl.month,
    monthLabel: pl.monthLabel,
    headSold: pl.headSold,
    saleRevenue: pl.saleRevenue,
    feedDeliveries: pl.feedDeliveries,
    feedQuantity: pl.feedQuantity,
    feedCost: pl.feedCost,
    commodityPurchases: pl.commodityPurchases,
    cattlePurchases: pl.cattlePurchases,
    medicineCost: pl.medicineCost,
    processingCost: pl.processingCost,
    otherExpenses: pl.otherExpenses,
    mortalityLoss: pl.mortalityLoss,
    deaths: pl.deaths,
    lotsReceived: pl.lotsReceived,
    totalOperatingCosts: pl.totalOperatingCosts,
    netOperatingPl: pl.netOperatingPl,
  };
}
