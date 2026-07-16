"use client";

import { useActionState } from "react";
import { resendSignUpConfirmation, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

export function ResendConfirmationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendSignUpConfirmation, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      {state.error ? (
        <p className="text-sm text-status-critical" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-navy/10 px-4 py-3 text-sm text-brown" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" fullWidth size="lg" disabled={pending || !email}>
        {pending ? "Sending…" : "Resend confirmation email"}
      </Button>
    </form>
  );
}
