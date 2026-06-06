import type { Metadata } from "next";
import { getUserSession } from "@/lib/auth/session";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Set Up Your Ranch — LAORS",
};

export default async function OnboardingPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");

  if (session.organization?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      existingOrgId={session.organization?.id}
      existingOrgName={session.organization?.name}
      existingModes={session.organization?.enabled_modes ?? []}
    />
  );
}
