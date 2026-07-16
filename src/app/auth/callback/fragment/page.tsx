import { Suspense } from "react";
import { AuthCallbackClient } from "@/components/auth/auth-callback-client";

export default function AuthCallbackFragmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <p className="text-lg font-semibold text-navy">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
