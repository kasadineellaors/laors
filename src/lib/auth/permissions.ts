import type { SupabaseClient } from "@supabase/supabase-js";
import type { SystemRole } from "@/types/database";
import { PERMISSIONS, type PermissionId } from "@/lib/permissions/roles";

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Mirrors `role_permissions` seed data — used when DB lookup is unavailable. */
const STATIC_ROLE_PERMISSIONS: Record<SystemRole, readonly PermissionId[]> = {
  owner: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.ORG_SETTINGS && p !== PERMISSIONS.ORG_USERS),
  worker: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TIME_CLOCK,
    PERMISSIONS.JOBS_COMPLETE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.TREATMENTS_WRITE,
    PERMISSIONS.TREATMENTS_VIEW,
  ],
  accountant: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.TREATMENTS_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_WRITE,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_WRITE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  veterinarian: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.TREATMENTS_VIEW,
    PERMISSIONS.TREATMENTS_WRITE,
  ],
  viewer: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.TREATMENTS_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  stocker_owner: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

export function roleHasPermissionStatic(
  role: string,
  permissionId: PermissionId,
): boolean {
  const perms = STATIC_ROLE_PERMISSIONS[role as SystemRole];
  return perms?.includes(permissionId) ?? false;
}

export async function roleHasPermission(
  supabase: SupabaseClient,
  role: string,
  permissionId: PermissionId,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("system_role", role)
    .eq("permission_id", permissionId)
    .maybeSingle();

  if (!error && data) return true;
  return roleHasPermissionStatic(role, permissionId);
}
