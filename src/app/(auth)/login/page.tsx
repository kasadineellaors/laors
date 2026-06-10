import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In — LAORS",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    params.redirect?.startsWith("/") && !params.redirect.startsWith("//")
      ? params.redirect
      : undefined;

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-charcoal">Welcome back</h1>
        <p className="mt-2 text-charcoal/70">Sign in to your ranch</p>
      </div>
      {params.error === "reset_session_expired" ? (
        <p className="mb-4 rounded-lg bg-rust/10 px-3 py-2 text-center text-sm text-rust">
          Password reset link expired — request a new one below.
        </p>
      ) : null}
      {params.error === "auth_callback_failed" || params.error === "email_link_failed" ? (
        <p className="mb-4 rounded-lg bg-rust/10 px-4 py-3 text-center text-sm text-rust">
          That email link didn&apos;t work — it may have expired. Try signing in with your
          password, or sign up again to get a new confirmation email.
        </p>
      ) : null}
      <LoginForm redirectTo={redirectTo} />
      <p className="mt-4 text-center text-sm">
        <a href="/forgot-password" className="text-olive hover:underline">
          Forgot password?
        </a>
      </p>
    </>
  );
}
