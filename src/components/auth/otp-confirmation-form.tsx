"use client";

import { useActionState } from "react";
import { confirmEmailWithOtp, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

export function OtpConfirmationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(confirmEmailWithOtp, initialState);

  return (
    <form action={action} className="space-y-3 rounded-lg border border-border-neutral bg-tan-light/20 p-4">
      <p className="text-sm font-medium text-navy">Have a confirmation code?</p>
      <p className="text-sm text-text-secondary">
        Enter the 6-digit code from your LAORS email if the link does not work.
      </p>
      <input type="hidden" name="email" value={email} />
      <input
        name="otp"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6,8}"
        maxLength={8}
        required
        placeholder="123456"
        className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-center text-xl tracking-[0.3em] text-navy"
      />
      {state.error ? (
        <p className="text-sm text-status-critical" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" fullWidth size="lg" disabled={pending || !email}>
        {pending ? "Verifying…" : "Verify with code"}
      </Button>
    </form>
  );
}
