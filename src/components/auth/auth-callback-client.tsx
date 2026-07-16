"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function failRedirect(router: ReturnType<typeof useRouter>, reason: string) {
  const params = new URLSearchParams({
    error: "email_link_failed",
    reason,
  });
  router.replace(`/login?${params.toString()}`);
}

async function resolvePostAuthPath(
  supabase: ReturnType<typeof createClient>,
  fallback: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallback;

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

export function AuthCallbackClient() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const supabase = createClient();
      setStatus("Finishing sign-in…");

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        failRedirect(router, error.message);
        return;
      }

      if (!session) {
        const hash = window.location.hash.slice(1);
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (cancelled) return;
            if (sessionError) {
              failRedirect(router, sessionError.message);
              return;
            }
          } else if (hashParams.get("error_description") || hashParams.get("error")) {
            failRedirect(
              router,
              hashParams.get("error_description") ?? hashParams.get("error") ?? "Sign-in failed.",
            );
            return;
          } else {
            failRedirect(router, "Missing confirmation code.");
            return;
          }
        } else {
          failRedirect(router, "Missing confirmation code.");
          return;
        }
      }

      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : null;

      const destination = safeNext ?? (await resolvePostAuthPath(supabase, "/dashboard"));
      if (cancelled) return;

      window.history.replaceState(null, "", window.location.pathname);
      router.replace(destination);
    }

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-semibold text-navy">{status}</p>
      <p className="mt-2 text-sm text-text-secondary">You will be redirected in a moment.</p>
    </div>
  );
}
