"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath, type AppModuleId } from "@/lib/auth/modules";

interface ModuleGuardProps {
  visibleModules: AppModuleId[];
}

/** Redirects to dashboard when the current route is outside the member's visible modules. */
export function ModuleGuard({ visibleModules }: ModuleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessPath(pathname, visibleModules)) {
      router.replace("/dashboard");
    }
  }, [pathname, visibleModules, router]);

  return null;
}
