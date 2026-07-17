export type LotPurchaseRecord = {
  id: string;
  cattle_group_id: string;
  purchased_at: string;
  arrival_date: string | null;
  seller_name: string | null;
  source_name: string | null;
  invoice_ref: string | null;
  head_count: number;
  pay_weight_lbs: number | null;
  received_weight_lbs: number | null;
  purchase_price_per_lb: number | null;
  landed_cost: number | null;
  notes: string | null;
  created_at: string;
};

export type LotPurchaseInput = {
  purchasedAt?: string;
  arrivalDate?: string;
  sellerName?: string;
  sourceName?: string;
  invoiceRef?: string;
  headCount: number;
  payWeightLbs?: number;
  receivedWeightLbs?: number;
  purchasePricePerLb?: number;
  landedCost?: number;
  notes?: string;
};
