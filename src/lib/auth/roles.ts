const MANAGER_ROLES = new Set(["owner", "manager"]);
const TEAM_TIME_ROLES = new Set(["owner", "manager", "accountant"]);
const FINANCE_ROLES = new Set(["owner", "manager", "accountant"]);

export function canWriteInventory(role: string | undefined | null): boolean {
  return Boolean(role && MANAGER_ROLES.has(role));
}

export function canManageTeam(role: string | undefined | null): boolean {
  return Boolean(role && MANAGER_ROLES.has(role));
}

export function canManageSetup(role: string | undefined | null): boolean {
  return Boolean(role && MANAGER_ROLES.has(role));
}

export function canViewTeamTime(role: string | undefined | null): boolean {
  return Boolean(role && TEAM_TIME_ROLES.has(role));
}

export function canManageInvoices(role: string | undefined | null): boolean {
  return Boolean(role && FINANCE_ROLES.has(role));
}

export function canRecordSales(role: string | undefined | null): boolean {
  return Boolean(role && role !== "viewer");
}

export function canDeductInventoryOnSale(role: string | undefined | null): boolean {
  return canWriteInventory(role);
}

/** Bulk CSV/PDF exports and invoice PDF download (reports.export permission). */
export function canExportReports(role: string | undefined | null): boolean {
  return Boolean(role && FINANCE_ROLES.has(role));
}
