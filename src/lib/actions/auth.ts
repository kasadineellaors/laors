"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/auth/app-url";
import { createSignUpConfirmationLink } from "@/lib/auth/confirmation-link";
import { isAuthEmailConfigured, sendSignUpConfirmationEmail } from "@/lib/email/auth-emails";
import { emailDeliverySetupMessage } from "@/lib/email/setup-status";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirectAfterAuth, slugify } from "@/lib/auth/session";
import type { OperationMode } from "@/types/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const DB_SETUP_HINT =
  "Fix: (A) Supabase Dashboard → Settings → API → copy service_role key into .env.local as SUPABASE_SERVICE_ROLE_KEY, restart dev — or (B) run supabase/RUN_THIS_IN_SUPABASE.sql in SQL Editor.";

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Name is required"),
});

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AuthActionState = {
  error?: string;
  success?: string;
};

function formatDbError(message: string): string {
  if (
    message.includes("create_ranch_organization") ||
    message.includes("schema cache") ||
    message.includes("row-level security")
  ) {
    return `${message} — ${DB_SETUP_HINT}`;
  }
  return message;
}

async function deliverSignUpConfirmation(input: {
  email: string;
  password?: string;
  fullName?: string;
}): Promise<AuthActionState | { delivered: true; existingAccount?: boolean; sessionReady?: boolean }> {
  const appUrl = await getAppUrl();
  const redirectTo = `${appUrl}/signup/verify`;

  if (isAuthEmailConfigured()) {
    const link = await createSignUpConfirmationLink({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      redirectTo,
    });

    if (!link.ok) {
      if (link.existingAccount) {
        return { delivered: true, existingAccount: true };
      }
      return { error: link.error };
    }

    const sent = await sendSignUpConfirmationEmail({
      to: input.email,
      fullName: input.fullName,
      confirmUrl: link.actionLink,
      emailOtp: link.emailOtp,
    });
    if (!sent.ok) return { error: sent.error };
    return { delivered: true };
  }

  if (input.password) {
    const setupMessage = emailDeliverySetupMessage();
    if (setupMessage) {
      return { error: `Cannot send confirmation email. ${setupMessage}` };
    }
  }

  const supabase = await createClient();
  if (input.password) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: input.fullName ? { full_name: input.fullName } : undefined,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) return { error: error.message };
    if (data.session) return { delivered: true, sessionReady: true };
    if (data.user?.identities?.length === 0) {
      return { delivered: true, existingAccount: true };
    }
    return { delivered: true };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: input.email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { error: error.message };
  return { delivered: true };
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await deliverSignUpConfirmation({
    email: parsed.data.email,
    password: parsed.data.password,
    fullName: parsed.data.fullName,
  });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  if ("delivered" in result && result.sessionReady) {
    return redirectAfterAuth();
  }

  const emailParam = encodeURIComponent(parsed.data.email);
  if ("delivered" in result && result.existingAccount) {
    redirect(`/signup/check-email?email=${emailParam}&existing=1`);
  }

  redirect(`/signup/check-email?email=${emailParam}`);
}

export async function resendSignUpConfirmation(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !z.string().email().safeParse(email).success) {
    return { error: "Enter a valid email" };
  }

  const result = await deliverSignUpConfirmation({ email });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  return { success: "Confirmation email sent. Check your inbox and spam folder." };
}

const emailOtpTypes: EmailOtpType[] = [
  "signup",
  "email",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
];

async function verifyEmailOtpWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input:
    | { token_hash: string; type: EmailOtpType }
    | { email: string; token: string; type: EmailOtpType },
) {
  const primary = await supabase.auth.verifyOtp(input);
  if (!primary.error) return primary;

  if ("token_hash" in input) {
    const fallbacks = emailOtpTypes.filter((type) => type !== input.type);
    for (const type of fallbacks) {
      const retry = await supabase.auth.verifyOtp({
        token_hash: input.token_hash,
        type,
      });
      if (!retry.error) return retry;
    }
  } else {
    for (const type of ["signup", "email"] as const) {
      if (type === input.type) continue;
      const retry = await supabase.auth.verifyOtp({
        email: input.email,
        token: input.token,
        type,
      });
      if (!retry.error) return retry;
    }
  }

  return primary;
}

export async function confirmEmailWithToken(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");

  if (typeof tokenHash !== "string" || !tokenHash.trim()) {
    return { error: "Confirmation link is missing its token." };
  }

  const otpType =
    typeof type === "string" && emailOtpTypes.includes(type as EmailOtpType)
      ? (type as EmailOtpType)
      : "signup";

  const supabase = await createClient();
  const { error } = await verifyEmailOtpWithFallback(supabase, {
    token_hash: tokenHash.trim(),
    type: otpType,
  });

  if (error) return { error: error.message };
  return redirectAfterAuth();
}

export async function confirmEmailWithOtp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  const otp = formData.get("otp");

  if (typeof email !== "string" || !z.string().email().safeParse(email).success) {
    return { error: "Enter the email address you signed up with." };
  }
  if (typeof otp !== "string" || !/^\d{6,8}$/.test(otp.trim())) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const supabase = await createClient();
  const { error } = await verifyEmailOtpWithFallback(supabase, {
    email: email.trim(),
    token: otp.trim(),
    type: "signup",
  });

  if (error) return { error: error.message };
  return redirectAfterAuth();
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Confirm your email first. Check your inbox (and spam), or sign up again and use Resend confirmation.",
      };
    }
    return { error: error.message };
  }

  const redirectTo = formData.get("redirect");
  if (
    typeof redirectTo === "string" &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//")
  ) {
    redirect(redirectTo);
  }

  redirect("/dashboard");
}

export async function signInWithMagicLink(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !z.string().email().safeParse(email).success) {
    return { error: "Enter a valid email" };
  }

  const supabase = await createClient();
  const appUrl = await getAppUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { success: "Check your email for a sign-in link." };
}

export async function resetPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !z.string().email().safeParse(email).success) {
    return { error: "Enter a valid email" };
  }

  const supabase = await createClient();
  const appUrl = await getAppUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: "Password reset link sent. Check your email." };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = formData.get("password");
  const confirm = formData.get("confirmPassword");

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const onboardingRanchSchema = z.object({
  ranchName: z.string().min(1, "Ranch name is required"),
  state: z.string().optional(),
  timezone: z.string().default("America/Chicago"),
});

function isMissingRanchRpc(message: string): boolean {
  return (
    message.includes("create_ranch_organization") ||
    message.includes("PGRST202") ||
    message.includes("schema cache")
  );
}

async function createRanchViaAdmin(
  userId: string,
  name: string,
  slug: string,
  state: string | undefined,
  timezone: string,
): Promise<{ orgId?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      error: `Ranch setup function missing in database. ${DB_SETUP_HINT}`,
    };
  }

  const orgId = crypto.randomUUID();
  const { error: orgError } = await admin.from("organizations").insert({
    id: orgId,
    name: name.trim(),
    slug,
    state: state?.trim() || null,
    timezone: timezone || "America/Chicago",
  });

  if (orgError) return { error: formatDbError(orgError.message) };

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: orgId,
    user_id: userId,
    system_role: "owner",
    joined_at: new Date().toISOString(),
  });

  if (memberError) return { error: formatDbError(memberError.message) };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ default_org_id: orgId })
    .eq("id", userId);

  if (profileError) return { error: formatDbError(profileError.message) };

  return { orgId };
}

export async function createRanchOrganization(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = onboardingRanchSchema.safeParse({
    ranchName: formData.get("ranchName"),
    state: formData.get("state") || undefined,
    timezone: formData.get("timezone") || "America/Chicago",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const slug = `${slugify(parsed.data.ranchName)}-${crypto.randomUUID().slice(0, 8)}`;
  const ranchInput = {
    name: parsed.data.ranchName,
    slug,
    state: parsed.data.state,
    timezone: parsed.data.timezone,
  };

  // Prefer service role when configured — works without DB RPC migration
  const admin = createAdminClient();
  if (admin) {
    const result = await createRanchViaAdmin(
      user.id,
      ranchInput.name,
      ranchInput.slug,
      ranchInput.state,
      ranchInput.timezone,
    );
    if (result.error) return { error: result.error };
    if (!result.orgId) return { error: "Failed to create ranch" };
    revalidatePath("/onboarding");
    return { success: result.orgId };
  }

  const { data: orgId, error: orgError } = await supabase.rpc(
    "create_ranch_organization",
    {
      p_name: ranchInput.name,
      p_slug: ranchInput.slug,
      p_state: ranchInput.state ?? "",
      p_timezone: ranchInput.timezone,
    },
  );

  if (orgError) {
    if (isMissingRanchRpc(orgError.message)) {
      return { error: formatDbError(orgError.message) + " — " + DB_SETUP_HINT };
    }
    return { error: formatDbError(orgError.message) };
  }

  if (!orgId) {
    return { error: "Failed to create ranch" };
  }

  revalidatePath("/onboarding");
  return { success: orgId };
}

async function requireOrgManager(orgId: string) {
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
  return { supabase, user, member };
}

export async function saveOperationModes(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const modes = formData.getAll("modes") as OperationMode[];
  const orgId = formData.get("orgId");

  if (typeof orgId !== "string" || !orgId) {
    return { error: "Organization not found" };
  }

  try {
    await requireOrgManager(orgId);
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ enabled_modes: modes })
    .eq("id", orgId);

  if (error) return { error: formatDbError(error.message) };
  revalidatePath("/onboarding");
  return { success: "Modes saved" };
}

export async function completeOnboarding(orgId: string): Promise<AuthActionState> {
  try {
    await requireOrgManager(orgId);
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) return { error: formatDbError(error.message) };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function skipOnboardingForNow(orgId: string) {
  return completeOnboarding(orgId);
}
