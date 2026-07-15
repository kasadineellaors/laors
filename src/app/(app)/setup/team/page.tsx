import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getEmailDeliveryStatus } from "@/lib/email/setup-status";
import { TeamSetupClient } from "@/components/setup/team-setup-client";

export default async function TeamSetupPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  const settings = (org?.settings as Record<string, unknown>) ?? {};
  const pendingInvites =
    (settings.pending_invites as Array<{ email: string; role: string }>) ?? [];

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("system_role, user_id")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const userIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const members = (memberRows ?? []).map((m) => {
    const p = profileById.get(m.user_id);
    return {
      name: p?.full_name?.trim() || "Team member",
      role: m.system_role,
      email: null as string | null,
    };
  });

  const emailStatus = getEmailDeliveryStatus();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Team</h1>
        <p className="text-charcoal/70">Invite managers and hands to this ranch</p>
      </div>
      <TeamSetupClient
        orgId={orgId}
        pendingInvites={pendingInvites}
        members={members}
        emailConfigured={emailStatus.configured}
        emailSetupMessage={
          emailStatus.configured
            ? ""
            : `Add ${emailStatus.missing.join(", ")} to .env.local (or Vercel for production), then restart the dev server.`
        }
      />
    </div>
  );
}
