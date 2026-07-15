import { createAdminClient } from "@/lib/supabase/admin";

type InviteLinkResult =
  | { ok: true; actionLink: string; userId: string }
  | { ok: false; error: string; existingAccount?: boolean };

export async function createTeamInviteLink(input: {
  email: string;
  redirectTo: string;
}): Promise<InviteLinkResult> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Team invites are not configured on the server. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }

  const result = await admin.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: { redirectTo: input.redirectTo },
  });

  if (result.error) {
    const message = result.error.message.toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      return { ok: false, error: result.error.message, existingAccount: true };
    }
    return { ok: false, error: result.error.message };
  }

  const actionLink = result.data.properties?.action_link;
  const userId = result.data.user?.id;
  if (!actionLink || !userId) {
    return { ok: false, error: "Could not generate invite link." };
  }

  return { ok: true, actionLink, userId };
}
