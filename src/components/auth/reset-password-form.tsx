"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Choose a new password for your LAORS account.</CardDescription>
      </CardHeader>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {state.error ? (
          <p className="text-sm text-rust" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal/70">
        <Link href="/login" className="font-semibold text-olive hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
