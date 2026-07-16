import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In — LAORS",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    params.redirect?.startsWith("/") && !params.redirect.startsWith("//")
      ? params.redirect
      : undefined;

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-navy">Welcome back</h1>
        <p className="mt-2 text-text-secondary">Sign in to your ranch</p>
      </div>
      {params.error === "reset_session_expired" ? (
        <p className="mb-4 rounded-lg bg-status-critical/10 px-3 py-2 text-center text-sm text-status-critical">
          Password reset link expired — request a new one below.
        </p>
      ) : null}
      {params.error === "auth_callback_failed" || params.error === "email_link_failed" ? (
        <div className="mb-4 space-y-2 rounded-lg bg-status-critical/10 px-4 py-3 text-center text-sm text-status-critical">
          <p>
            That email link didn&apos;t work — it may have expired, already been used, or opened by
            your email app before you tapped it.
          </p>
          <p className="text-text-secondary">
            Try signing in with your password, or{" "}
            <a href="/signup/check-email" className="font-medium text-brown hover:underline">
              enter your confirmation code
            </a>
            .
          </p>
          {params.reason ? (
            <p className="text-xs text-text-secondary">Details: {params.reason}</p>
          ) : null}
        </div>
      ) : null}
      <LoginForm redirectTo={redirectTo} />
      <p className="mt-4 text-center text-sm">
        <a href="/forgot-password" className="text-brown hover:underline">
          Forgot password?
        </a>
      </p>
    </>
  );
}
