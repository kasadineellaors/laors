export interface MonthlyOperationsSummary {
  month: string;
  monthLabel: string;
  headSold: number;
  saleRevenue: number;
  feedDeliveries: number;
  feedQuantity: number;
  feedCost: number;
  commodityPurchases: number;
  otherExpenses: number;
  deaths: number;
  lotsReceived: number;
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
