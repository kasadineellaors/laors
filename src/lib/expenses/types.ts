export interface LotExpenseRecord {
  id: string;
  cattle_group_id: string;
  financial_category_id: string | null;
  category_name: string | null;
  expense_date: string;
  amount: number;
  description: string | null;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Freight",
  "Commission",
  "Labor",
  "Pasture",
  "Fuel",
  "Repairs",
  "Supplies",
  "Insurance",
  "Marketing",
  "Interest",
  "Other",
] as const;
