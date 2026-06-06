import type { UserSession } from "./session";

/** Where to send a signed-in user based on ranch setup progress. */
export function getAuthRedirectPath(session: UserSession | null): string {
  if (!session) return "/login";
  if (!session.organization?.id) return "/onboarding";
  if (!session.organization.onboarding_completed_at) return "/onboarding";
  return "/dashboard";
}

export function isOnboardingComplete(session: UserSession | null): boolean {
  return Boolean(
    session?.organization?.id && session.organization.onboarding_completed_at,
  );
}
