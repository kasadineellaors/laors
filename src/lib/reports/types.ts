export interface MonthlyOperationsSummary {
  month: string;
  monthLabel: string;
  headSold: number;
  saleRevenue: number;
  feedDeliveries: number;
  feedQuantity: number;
  feedCost: number;
  commodityPurchases: number;
  cattlePurchases: number;
  medicineCost: number;
  processingCost: number;
  otherExpenses: number;
  mortalityLoss: number;
  deaths: number;
  lotsReceived: number;
  totalOperatingCosts: number;
  netOperatingPl: number;
}

export interface OperationPlSummary {
  month: string;
  monthLabel: string;
  headSold: number;
  lotsReceived: number;
  deaths: number;
  feedDeliveries: number;
  feedQuantity: number;
  saleRevenue: number;
  cattlePurchases: number;
  feedCost: number;
  medicineCost: number;
  processingCost: number;
  otherExpenses: number;
  mortalityLoss: number;
  commodityPurchases: number;
  totalOperatingCosts: number;
  netOperatingPl: number;
}

export interface EnterprisePlRow {
  enterprise_type: string;
  label: string;
  lot_count: number;
  current_head: number;
  purchase_cost: number;
  feed_cost: number;
  medicine_cost: number;
  processing_cost: number;
  other_expenses: number;
  sale_revenue: number;
  total_invested: number;
  net_position: number;
}
