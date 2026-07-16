"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signInWithMagicLink, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signIn,
    initialState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign in with password</CardTitle>
          <CardDescription>Use the email and password for your account.</CardDescription>
        </CardHeader>
        <form action={passwordAction} className="space-y-4">
          {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
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
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {passwordState.error ? (
            <p className="text-sm text-status-critical" role="alert">
              {passwordState.error}
            </p>
          ) : null}
          <Button type="submit" fullWidth size="lg" disabled={passwordPending}>
            {passwordPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Or use a magic link</CardTitle>
          <CardDescription>
            No password needed — we&apos;ll email you a sign-in link.
          </CardDescription>
        </CardHeader>
        <form action={magicAction} className="space-y-4">
          <div>
            <Label htmlFor="magic-email">Email</Label>
            <Input
              id="magic-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@ranch.com"
            />
          </div>
          {magicState.error ? (
            <p className="text-sm text-status-critical" role="alert">
              {magicState.error}
            </p>
          ) : null}
          {magicState.success ? (
            <p className="text-sm text-sage" role="status">
              {magicState.success}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="secondary"
            fullWidth
            size="lg"
            disabled={magicPending}
          >
            {magicPending ? "Sending…" : "Email Me a Link"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        New to LAORS?{" "}
        <Link href="/signup" className="font-semibold text-brown hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
