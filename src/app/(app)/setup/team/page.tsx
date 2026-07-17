import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getEmailDeliveryStatus } from "@/lib/email/setup-status";
import type { SystemRole } from "@/types/database";
import { TeamSetupClient } from "@/components/setup/team-setup-client";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Team — LAORS",
};

export default async function TeamSetupPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const inviterIsOwner = session.membership?.system_role === "owner";
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  const settings = (org?.settings as Record<string, unknown>) ?? {};
  const pendingInvites =
    (settings.pending_invites as Array<{
      email: string;
      role: string;
      visible_modules?: string[] | null;
    }>) ?? [];

  const { data: memberRowsRaw, error: membersError } = await supabase
    .from("organization_members")
    .select("id, system_role, visible_modules, user_id")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  let memberRows = memberRowsRaw;
  if (
    membersError &&
    (membersError.message.includes("visible_modules") ||
      membersError.message.includes("schema cache"))
  ) {
    const { data: fallback } = await supabase
      .from("organization_members")
      .select("id, system_role, user_id")
      .eq("organization_id", orgId)
      .eq("is_active", true);
    memberRows = (fallback ?? []).map((row) => ({ ...row, visible_modules: null }));
  } else if (membersError) {
    throw membersError;
  }

  const userIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const members = (memberRows ?? []).map((m) => {
    const p = profileById.get(m.user_id);
    return {
      id: m.id,
      name: p?.full_name?.trim() || "Team member",
      role: m.system_role as SystemRole,
      visibleModules: m.visible_modules,
    };
  });

  const emailStatus = getEmailDeliveryStatus();

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Team"
        subtitle="Invite workers, assign roles, and choose what each person can see."
      />
      <TeamSetupClient
        orgId={orgId}
        inviterIsOwner={inviterIsOwner}
        pendingInvites={pendingInvites}
        members={members}
        emailConfigured={emailStatus.configured}
        emailSetupMessage={
          emailStatus.configured
            ? ""
            : `Add ${emailStatus.missing.join(", ")} to .env.local (or Vercel for production), then restart the dev server.`
        }
      />
    </ManageSubpageShell>
  );
}
