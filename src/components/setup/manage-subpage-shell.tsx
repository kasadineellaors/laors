import type { ReactNode } from "react";
import { AppPageShell } from "@/components/layout/app-page-shell";

interface ManageSubpageShellProps {
  children: ReactNode;
  className?: string;
}

export function ManageSubpageShell({ children, className }: ManageSubpageShellProps) {
  return (
    <AppPageShell narrow className={className}>
      {children}
    </AppPageShell>
  );
}
