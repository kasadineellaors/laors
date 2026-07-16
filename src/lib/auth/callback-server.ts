import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function loginFailureRedirect(request: NextRequest, reason: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", "email_link_failed");
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

async function resolveDestination(
  supabase: ReturnType<typeof createServerClient>,
  next: string | null,
) {
  const explicit = safeNextPath(next);
  if (explicit) return explicit;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.default_org_id) return "/onboarding";

  const { data: org } = await supabase
    .from("organizations")
    .select("onboarding_completed_at")
    .eq("id", profile.default_org_id)
    .maybeSingle();

  if (!org?.onboarding_completed_at) return "/onboarding";
  return "/dashboard";
}

export async function completeAuthFromSearchParams(
  request: NextRequest,
  searchParams: URLSearchParams,
) {
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const authError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (authError) {
    return loginFailureRedirect(request, errorDescription ?? authError);
  }

  if (!code && !tokenHash) {
    return null;
  }

  const { url, key } = getSupabaseEnv();
  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookieResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginFailureRedirect(request, error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) return loginFailureRedirect(request, error.message);
  } else if (tokenHash) {
    const signupAttempt = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "signup",
    });
    if (signupAttempt.error) {
      const emailAttempt = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (emailAttempt.error) {
        return loginFailureRedirect(request, emailAttempt.error.message);
      }
    }
  }

  const destination = await resolveDestination(supabase, next);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = destination;
  redirectUrl.search = "";

  const redirectResponse = NextResponse.redirect(redirectUrl);
  cookieResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
