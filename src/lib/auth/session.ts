import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationMember, Profile } from "@/types/database";
import { getAuthRedirectPath } from "@/lib/auth/redirects";
import { redirect } from "next/navigation";

export interface UserSession {
  user: { id: string; email?: string };
  profile: Profile | null;
  membership: OrganizationMember | null;
  organization: Organization | null;
}

export async function getUserSession(): Promise<UserSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let organization: Organization | null = null;
  let membership: OrganizationMember | null = null;

  // Prefer default org on profile
  if (profile?.default_org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.default_org_id)
      .maybeSingle();

    const { data: member } = await supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", profile.default_org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    organization = org;
    membership = member;
  }

  // Fallback: first active membership (e.g. default_org_id not set yet)
  if (!organization) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (member) {
      membership = member;
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", member.organization_id)
        .maybeSingle();
      organization = org;
    }
  }

  return {
    user: { id: user.id, email: user.email },
    profile,
    membership,
    organization,
  };
}

export async function requireUser(): Promise<UserSession> {
  const session = await getUserSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireOnboardedUser(): Promise<UserSession> {
  const session = await requireUser();
  if (!session.organization?.onboarding_completed_at) {
    redirect("/onboarding");
  }
  return session;
}

export async function redirectAfterAuth(): Promise<never> {
  const session = await getUserSession();
  redirect(getAuthRedirectPath(session));
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
