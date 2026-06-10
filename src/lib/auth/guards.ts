import { createClient } from "@/lib/supabase/server";
import type { PermissionId } from "@/lib/permissions/roles";
import { roleHasPermission } from "@/lib/auth/permissions";
import type { SystemRole } from "@/types/database";

export type GuardMember = {
  system_role: SystemRole;
  user_id: string;
};

export class AuthGuardError extends Error {
  readonly status: 400 | 401 | 403;

  constructor(message: string, status: 400 | 401 | 403) {
    super(message);
    this.status = status;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertUuid(value: string, label = "id"): void {
  if (!UUID_RE.test(value)) {
    throw new AuthGuardError(`Invalid ${label}`, 403);
  }
}

export function assertOptionalDateRange(from?: string, to?: string): void {
  if (from && !DATE_RE.test(from)) {
    throw new AuthGuardError("Invalid from date", 400);
  }
  if (to && !DATE_RE.test(to)) {
    throw new AuthGuardError("Invalid to date", 400);
  }
}

export function sanitizeFilename(name: string, fallback = "download"): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return safe || fallback;
}

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthGuardError("Not authenticated", 401);
  }

  return { supabase, user };
}

export async function requireOrgMember(orgId: string) {
  assertUuid(orgId, "organization id");
  const { supabase, user } = await requireAuth();

  const { data: member } = await supabase
    .from("organization_members")
    .select("system_role, user_id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) {
    throw new AuthGuardError("Not authorized for this ranch", 403);
  }

  return {
    supabase,
    user,
    member: member as GuardMember,
  };
}

export async function requireOrgRoles(orgId: string, roles: SystemRole[]) {
  const ctx = await requireOrgMember(orgId);
  if (!roles.includes(ctx.member.system_role)) {
    throw new AuthGuardError("Insufficient role", 403);
  }
  return ctx;
}

export async function requirePermission(orgId: string, permissionId: PermissionId) {
  const ctx = await requireOrgMember(orgId);
  const allowed = await roleHasPermission(
    ctx.supabase,
    ctx.member.system_role,
    permissionId,
  );
  if (!allowed) {
    throw new AuthGuardError("Permission denied", 403);
  }
  return ctx;
}

/** For Route Handlers — returns a Response or null context. */
export async function authorizeApi(
  orgId: string,
  permissionId?: PermissionId,
): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"]; user: { id: string } }
  | { ok: false; response: Response }
> {
  try {
    assertUuid(orgId, "organization id");
    const ctx = permissionId
      ? await requirePermission(orgId, permissionId)
      : await requireOrgMember(orgId);
    return { ok: true, supabase: ctx.supabase, user: ctx.user };
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return { ok: false, response: new Response(e.message, { status: e.status }) };
    }
    return { ok: false, response: new Response("Forbidden", { status: 403 }) };
  }
}
