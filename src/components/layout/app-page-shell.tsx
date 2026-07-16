import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface AppPageShellProps {
  children: ReactNode;
  className?: string;
  /** Use for setup/forms-heavy pages (Manage, Properties & Locations). */
  narrow?: boolean;
}

export function AppPageShell({ children, className, narrow = false }: AppPageShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col gap-6",
        narrow && "mx-auto w-full max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
