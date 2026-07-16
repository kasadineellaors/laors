import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmailVerifyClient } from "@/components/auth/email-verify-client";

export const metadata: Metadata = {
  title: "Confirm Email — LAORS",
};

export default async function SignUpVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-navy">Confirm your email</h1>
        <p className="mt-2 text-text-secondary">One last step before you can sign in.</p>
      </div>

      <Suspense
        fallback={
          <p className="text-center text-sm text-text-secondary">Loading confirmation…</p>
        }
      >
        <EmailVerifyClient emailHint={email?.trim()} />
      </Suspense>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already confirmed?{" "}
        <Link href="/login" className="font-semibold text-brown hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
