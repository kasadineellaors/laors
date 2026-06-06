import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In — LAORS",
};

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-charcoal">Welcome back</h1>
        <p className="mt-2 text-charcoal/70">Sign in to your ranch</p>
      </div>
      <LoginForm />
      <p className="mt-4 text-center text-sm">
        <a href="/forgot-password" className="text-olive hover:underline">
          Forgot password?
        </a>
      </p>
    </>
  );
}
