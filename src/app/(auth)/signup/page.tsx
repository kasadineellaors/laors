import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account — LAORS",
};

export default function SignUpPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-navy">Get started</h1>
        <p className="mt-2 text-text-secondary">The Foreman for your cattle operation</p>
      </div>
      <SignUpForm />
    </>
  );
}
