"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  confirmEmailWithOtp,
  confirmEmailWithToken,
  type AuthActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: AuthActionState = {};

export function EmailVerifyClient({ emailHint }: { emailHint?: string }) {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "signup";
  const email = searchParams.get("email")?.trim() || emailHint || "";

  const [tokenState, confirmToken, tokenPending] = useActionState(
    confirmEmailWithToken,
    initialState,
  );
  const [otpState, confirmOtp, otpPending] = useActionState(
    confirmEmailWithOtp,
    initialState,
  );

  const error = tokenState.error ?? otpState.error;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-status-critical/10 px-4 py-3 text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      {tokenHash ? (
        <Card>
          <CardHeader>
            <CardTitle>Confirm your email</CardTitle>
            <CardDescription>
              Tap the button below to finish creating your account. This extra step helps when
              email apps open links before you do.
            </CardDescription>
          </CardHeader>
          <form action={confirmToken} className="space-y-4 px-4 pb-4">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <Button type="submit" fullWidth size="xl" disabled={tokenPending}>
              {tokenPending ? "Confirming…" : "Confirm my email"}
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Enter your confirmation code</CardTitle>
            <CardDescription>
              Open the LAORS email and enter the 6-digit code below. This works even if the link
              in the email was opened by your mail app first.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{tokenHash ? "Or use your code" : "Confirmation code"}</CardTitle>
          <CardDescription>
            The code is in the email we sent you. It looks like <strong>123456</strong>.
          </CardDescription>
        </CardHeader>
        <form action={confirmOtp} className="space-y-4 px-4 pb-4">
          <div>
            <label htmlFor="verify-email" className="mb-1 block text-sm font-medium text-navy">
              Email
            </label>
            <input
              id="verify-email"
              name="email"
              type="email"
              required
              defaultValue={email}
              placeholder="you@ranch.com"
              className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-navy"
            />
          </div>
          <div>
            <label htmlFor="verify-otp" className="mb-1 block text-sm font-medium text-navy">
              6-digit code
            </label>
            <input
              id="verify-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              maxLength={8}
              required
              placeholder="123456"
              className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-center text-2xl tracking-[0.3em] text-navy"
            />
          </div>
          <Button type="submit" variant="secondary" fullWidth size="xl" disabled={otpPending}>
            {otpPending ? "Verifying…" : "Verify with code"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
