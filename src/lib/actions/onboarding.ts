"use server";

import { getAppUrl } from "@/lib/auth/app-url";
import { createTeamInviteLink } from "@/lib/auth/invite-link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthEmailConfigured, sendTeamInviteEmail } from "@/lib/email/auth-emails";
import { emailDeliverySetupMessage } from "@/lib/email/setup-status";
import { getSuggestedLocationTypes } from "@/lib/config/defaults";
import type { OperationMode } from "@/types/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ActionState = {
  error?: string;
  success?: string;
};

async function requireOrgAccess(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("organization_members")
    .select("system_role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member || !["owner", "manager"].includes(member.system_role)) {
    throw new Error("Not authorized");
  }

  return { supabase, user };
}

/** Seed statuses, reasons, categories, classifications via DB function. */
export async function seedRanchDefaults(
  orgId: string,
  modes: OperationMode[],
): Promise<ActionState> {
  try {
    const { supabase } = await requireOrgAccess(orgId);
    const { error } = await supabase.rpc("seed_ranch_defaults", {
      p_org_id: orgId,
      p_modes: modes,
    });
    if (error) return { error: error.message };
    return { success: "Defaults seeded" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to seed defaults" };
  }
}

const locationTypesSchema = z.object({
  orgId: z.string().uuid(),
  types: z.array(
    z.object({
      name: z.string().min(1),
      pluralName: z.string().optional(),
      tier: z.enum(["property", "location"]),
    }),
  ).min(1),
});

export async function saveLocationTypes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgId = formData.get("orgId") as string;
  const typesJson = formData.get("types") as string;

  let types: z.infer<typeof locationTypesSchema>["types"];
  try {
    types = JSON.parse(typesJson);
  } catch {
    return { error: "Invalid location types data" };
  }

  const parsed = locationTypesSchema.safeParse({ orgId, types });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { supabase } = await requireOrgAccess(parsed.data.orgId);

    for (let i = 0; i < parsed.data.types.length; i++) {
      const t = parsed.data.types[i];
      const { error } = await supabase.from("location_types").upsert(
        {
          organization_id: parsed.data.orgId,
          name: t.name.trim(),
          plural_name: t.pluralName?.trim() || t.name.trim() + "s",
          tier: t.tier,
          sort_order: i,
          is_active: true,
        },
        { onConflict: "organization_id,name" },
      );
      if (error) return { error: error.message };
    }

    revalidatePath("/onboarding");
    revalidatePath("/setup");
    return { success: "Location types saved" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save" };
  }
}

export async function createProperty(
  orgId: string,
  name: string,
  acres?: number,
  capacityHead?: number,
): Promise<ActionState & { locationId?: string }> {
  try {
    const { supabase } = await requireOrgAccess(orgId);

    const { data: propertyType } = await supabase
      .from("location_types")
      .select("id")
      .eq("organization_id", orgId)
      .eq("tier", "property")
      .eq("is_active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

    if (!propertyType) {
      return { error: "Add a property-tier location type first" };
    }

    const { data: activeStatus } = await supabase
      .from("location_statuses")
      .select("id")
      .eq("organization_id", orgId)
      .eq("name", "Active")
      .maybeSingle();

    const { data: loc, error } = await supabase
      .from("locations")
      .insert({
        organization_id: orgId,
        location_type_id: propertyType.id,
        parent_id: null,
        name: name.trim(),
        acres: acres ?? null,
        capacity_head: capacityHead ?? null,
        status_id: activeStatus?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !loc) return { error: error?.message ?? "Failed to create property" };

    revalidatePath("/onboarding");
    revalidatePath("/setup");
    return { success: "Property created", locationId: loc.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create property" };
  }
}

export async function createLocationUnderParent(
  orgId: string,
  parentId: string,
  name: string,
  locationTypeId?: string,
  acres?: number,
  capacityHead?: number,
): Promise<ActionState & { locationId?: string }> {
  try {
    const { supabase } = await requireOrgAccess(orgId);

    const { data: parent } = await supabase
      .from("locations")
      .select("id, depth")
      .eq("id", parentId)
      .eq("organization_id", orgId)
      .single();

    if (!parent) return { error: "Parent location not found" };
    if (parent.depth >= 2) return { error: "Cannot add sub-locations below depth 2" };

    let typeId = locationTypeId;
    if (!typeId) {
      const { data: locType } = await supabase
        .from("location_types")
        .select("id")
        .eq("organization_id", orgId)
        .eq("tier", "location")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (!locType) return { error: "Add a location-tier type first" };
      typeId = locType.id;
    }

    const { data: activeStatus } = await supabase
      .from("location_statuses")
      .select("id")
      .eq("organization_id", orgId)
      .eq("name", "Active")
      .maybeSingle();

    const { data: loc, error } = await supabase
      .from("locations")
      .insert({
        organization_id: orgId,
        location_type_id: typeId,
        parent_id: parentId,
        name: name.trim(),
        acres: acres ?? null,
        capacity_head: capacityHead ?? null,
        status_id: activeStatus?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !loc) return { error: error?.message ?? "Failed to create location" };

    revalidatePath("/onboarding");
    revalidatePath("/setup");
    return { success: "Location created", locationId: loc.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create location" };
  }
}

export async function setupOnboardingConfig(
  orgId: string,
  modes: OperationMode[],
): Promise<ActionState> {
  await seedRanchDefaults(orgId, modes);

  const suggestions = getSuggestedLocationTypes(modes);
  const formData = new FormData();
  formData.set("orgId", orgId);
  formData.set("types", JSON.stringify(suggestions));
  return saveLocationTypes({}, formData);
}

const inviteSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["manager", "worker"]),
});

export async function inviteTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = inviteSchema.safeParse({
    orgId: formData.get("orgId"),
    email: formData.get("email"),
    role: formData.get("role") ?? "worker",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const role = parsed.data.role;
  const orgId = parsed.data.orgId;

  try {
    await requireOrgAccess(orgId);

    const admin = createAdminClient();
    const appUrl = await getAppUrl();
    const redirectTo = `${appUrl}/auth/callback`;

    const { data: orgRow } = await (admin ?? (await createClient()))
      .from("organizations")
      .select("name, settings")
      .eq("id", orgId)
      .single();
    const orgName = orgRow?.name ?? undefined;

    if (admin && isAuthEmailConfigured()) {
      const invite = await createTeamInviteLink({ email, redirectTo });

      if (!invite.ok && invite.existingAccount) {
        const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = listData.users.find((u) => u.email?.toLowerCase() === email);
        if (existing) {
          const { error: memberError } = await admin.from("organization_members").upsert(
            {
              organization_id: orgId,
              user_id: existing.id,
              system_role: role,
              is_active: true,
              joined_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,user_id" },
          );
          if (memberError) return { error: memberError.message };
          revalidatePath("/setup/team");
          return { success: `${email} added to this ranch` };
        }
      }

      if (!invite.ok) {
        return { error: invite.error };
      }

      const sent = await sendTeamInviteEmail({
        to: email,
        orgName,
        inviteUrl: invite.actionLink,
      });
      if (!sent.ok) return { error: sent.error };

      const { error: memberError } = await admin.from("organization_members").insert({
        organization_id: orgId,
        user_id: invite.userId,
        system_role: role,
        joined_at: new Date().toISOString(),
      });

      if (memberError && !memberError.message.includes("duplicate")) {
        return { error: memberError.message };
      }

      revalidatePath("/setup/team");
      return { success: `Invite email sent to ${email}` };
    }

    const { supabase } = await requireOrgAccess(orgId);
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) ?? {};
    const pending = (settings.pending_invites as Array<{ email: string; role: string }>) ?? [];
    if (!pending.some((p) => p.email.toLowerCase() === email)) {
      pending.push({ email, role });
    }

    const { error } = await supabase
      .from("organizations")
      .update({ settings: { ...settings, pending_invites: pending } })
      .eq("id", orgId);

    if (error) return { error: error.message };
    revalidatePath("/setup/team");
    const setupMessage = emailDeliverySetupMessage();
    return {
      success: setupMessage
        ? `Invite saved for ${email} — ${setupMessage}`
        : `Invite saved for ${email} — add SUPABASE_SERVICE_ROLE_KEY to send email invites`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to invite" };
  }
}
