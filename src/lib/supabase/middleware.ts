import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/cattle") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/health") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/time") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/weather") ||
    pathname.startsWith("/app");

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (isAuthRoute || pathname === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_org_id")
      .eq("id", user.id)
      .maybeSingle();

    let onboardingComplete = false;

    if (profile?.default_org_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("onboarding_completed_at")
        .eq("id", profile.default_org_id)
        .maybeSingle();
      onboardingComplete = Boolean(org?.onboarding_completed_at);
    }

    const dest = request.nextUrl.clone();
    dest.pathname =
      !profile?.default_org_id || !onboardingComplete
        ? "/onboarding"
        : "/dashboard";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  // Logged-in user hitting callback is handled by the route handler
  if (user && isAuthCallback) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
