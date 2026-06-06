"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-xl font-bold text-charcoal">Something went wrong</h1>
      <p className="max-w-md text-sm text-charcoal/70">
        If you just set up Supabase, run the full migration path in the README (
        <code className="text-xs">RUN_ALL_PHASES.sql</code> or{" "}
        <code className="text-xs">supabase db push</code>).
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
