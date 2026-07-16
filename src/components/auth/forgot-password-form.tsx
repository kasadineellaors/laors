"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send a reset link.
        </CardDescription>
      </CardHeader>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@ranch.com"
          />
        </div>
        {state.error ? (
          <p className="text-sm text-status-critical" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-sage" role="status">
            {state.success}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="font-semibold text-brown hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
