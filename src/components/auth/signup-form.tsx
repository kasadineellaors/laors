"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: AuthActionState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Set up LAORS for your ranch. You&apos;ll configure your operation next.
        </CardDescription>
      </CardHeader>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Your name</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            required
            placeholder="John Smith"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
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
        <Button type="submit" fullWidth size="xl" disabled={pending}>
          {pending ? "Creating account…" : "Create Account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brown hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
