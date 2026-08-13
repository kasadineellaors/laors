export interface OwnerTotalsMetrics {
  currentHead: number;
  totalReceived: number;
  totalShipped: number;
  deathLoss: number;
  currentInventory: number;
  totalExpenses: number;
  costPerHead: number | null;
  avgDailyCost: number | null;
  headDays: number;
  daysOnFeed: number | null;
}

export interface OwnerTotalsLotRow extends OwnerTotalsMetrics {
  lotId: string;
  lotName: string;
  lotNumber: string | null;
  lotStatus: string;
  locationId: string | null;
  locationName: string | null;
  locationBreadcrumb: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerShare: number;
}

export interface OwnerTotalsLocationRow extends OwnerTotalsMetrics {
  locationId: string | null;
  locationName: string;
  locationBreadcrumb: string | null;
  lotIds: string[];
}

export interface OwnerTotalsOwnerRow extends OwnerTotalsMetrics {
  ownerId: string;
  ownerName: string;
  lotCount: number;
  lots: OwnerTotalsLotRow[];
  byLocation: OwnerTotalsLocationRow[];
}

export interface OwnerTotalsReport {
  periodStart: string;
  periodEnd: string;
  dayCount: number;
  owners: OwnerTotalsOwnerRow[];
  totals: OwnerTotalsMetrics;
  warnings: string[];
}
