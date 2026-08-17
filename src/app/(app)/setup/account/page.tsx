import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { AccountSettingsPanel } from "@/components/setup/account-settings-panel";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Account — LAORS",
};

export default async function AccountSettingsPage() {
  const session = await requireOnboardedUser();
  const email = session.user.email ?? "";
  const fullName = session.profile?.full_name ?? null;

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Account"
        subtitle="Profile, support links, and account deletion."
      />
      <AccountSettingsPanel email={email} fullName={fullName} />
    </ManageSubpageShell>
  );
}
