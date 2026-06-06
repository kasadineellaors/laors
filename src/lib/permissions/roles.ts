import type { SystemRole } from "@/types/database";

export const PERMISSIONS = {
  ORG_SETTINGS: "org.settings",
  ORG_USERS: "org.users",
  DASHBOARD_VIEW: "dashboard.view",
  TIME_CLOCK: "time.clock",
  TIME_VIEW_ALL: "time.view_all",
  JOBS_CREATE: "jobs.create",
  JOBS_COMPLETE: "jobs.complete",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_WRITE: "inventory.write",
  TREATMENTS_WRITE: "treatments.write",
  TREATMENTS_VIEW: "treatments.view",
  MEDICINE_MANAGE: "medicine.manage",
  LAND_MANAGE: "land.manage",
  SALES_WRITE: "sales.write",
  SALES_VIEW: "sales.view",
  INVOICES_WRITE: "invoices.write",
  INVOICES_VIEW: "invoices.view",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
} as const;

export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  owner: "Owner",
  manager: "Manager",
  worker: "Worker",
  accountant: "Accountant",
  veterinarian: "Veterinarian",
  viewer: "Viewer",
  stocker_owner: "Stocker Owner",
};

export function canManageOrg(role: SystemRole): boolean {
  return role === "owner";
}

export function canManageTeam(role: SystemRole): boolean {
  return role === "owner" || role === "manager";
}

export function canWriteInventory(role: SystemRole): boolean {
  return role === "owner" || role === "manager";
}
