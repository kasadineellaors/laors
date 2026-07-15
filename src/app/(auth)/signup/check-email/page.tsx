import type { Metadata } from "next";
import Link from "next/link";
import { ResendConfirmationForm } from "@/components/auth/resend-confirmation-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Check Your Email — LAORS",
};

export default async function SignUpCheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; existing?: string }>;
}) {
  const { email, error, existing } = await searchParams;
  const displayEmail = email?.trim() || "";

  return (
    <>
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-olive/15 text-3xl"
          aria-hidden
        >
          ✉️
        </div>
        <h1 className="text-3xl font-bold text-charcoal">Check your email</h1>
        <p className="mt-2 text-lg text-charcoal/70">You&apos;re almost set up.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>One more step</CardTitle>
          <CardDescription>
            {displayEmail ? (
              <>
                We sent a confirmation link to{" "}
                <span className="font-semibold text-charcoal">{displayEmail}</span>
              </>
            ) : (
              "We sent a confirmation link to your email address."
            )}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-4 pb-4 text-base text-charcoal/80">
          {existing === "1" ? (
            <p className="rounded-lg bg-tan-light/40 px-4 py-3 text-sm text-charcoal/70">
              An account with this email may already exist. If you never confirmed it, use the
              button below to send a fresh confirmation email.
            </p>
          ) : null}
          {error === "link_failed" ? (
            <p className="rounded-lg bg-rust/10 px-4 py-3 text-sm text-rust">
              That confirmation link didn&apos;t work. Wait for a fresh email after signing up,
              or try signing in if you already confirmed your account.
            </p>
          ) : null}
          <ol className="list-decimal space-y-3 pl-5">
            <li>Open your email on this phone or computer.</li>
            <li>Look for a message from LAORS.</li>
            <li>Tap or click the link in that email to finish creating your account.</li>
          </ol>
          <p className="rounded-lg bg-tan-light/40 px-4 py-3 text-sm text-charcoal/70">
            Don&apos;t see the email? Check your spam or junk folder. It can take a minute or
            two to arrive.
          </p>
          {displayEmail ? <ResendConfirmationForm email={displayEmail} /> : null}
          <Link href="/login">
            <Button type="button" fullWidth size="xl">
              Go to sign in
            </Button>
          </Link>
          <p className="text-center text-sm text-charcoal/60">
            Already confirmed?{" "}
            <Link href="/login" className="font-semibold text-olive hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </Card>
    </>
  );
}
