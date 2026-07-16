export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export type BillingCategory =
  | "yardage"
  | "treatments"
  | "feed"
  | "processing"
  | "misc"
  | "dead";

export interface InvoiceLineRecord {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  category: BillingCategory | null;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_address: string | null;
  customer_id: string | null;
  owner_id: string | null;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: number;
  notes: string | null;
  sales_record_id: string | null;
  created_by_name: string | null;
  lines: InvoiceLineRecord[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  category?: BillingCategory | null;
}

export interface InvoiceSummary {
  openCount: number;
  unpaidTotal: number;
}

export type BillingLineSource = "yardage" | "treatment" | "feeding" | "misc";

export interface BillingLinePreview {
  description: string;
  quantity: number;
  unitPrice: number;
  category?: BillingCategory;
  source: BillingLineSource;
  treatmentId?: string;
  feedingRecordId?: string;
}

export interface GroupHeadDaysBreakdown {
  groupId: string;
  groupName: string;
  headDays: number;
  avgHead: number;
  headAtStart: number;
  headAtEnd: number;
}

export interface BillingPreview {
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  ownerAddress: string | null;
  /** @deprecated use ownerId */
  customerId: string;
  /** @deprecated use ownerName */
  customerName: string;
  /** @deprecated use ownerEmail */
  customerEmail: string | null;
  /** @deprecated use ownerAddress */
  customerAddress: string | null;
  periodStart: string;
  periodEnd: string;
  dayCount: number;
  totalHead: number;
  totalHeadDays: number;
  headDaysBreakdown: GroupHeadDaysBreakdown[];
  lines: BillingLinePreview[];
  warnings: string[];
  subtotal: number;
  treatmentIds: string[];
  feedingRecordIds: string[];
  processingEventIds: string[];
  mortalityRecordIds: string[];
  miscChargeIds: string[];
}
