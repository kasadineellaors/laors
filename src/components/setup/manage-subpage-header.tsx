import { AppPageHeader } from "@/components/layout/app-page-header";
import type { ReactNode } from "react";

interface ManageSubpageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  className?: string;
}

export function ManageSubpageHeader({
  title,
  subtitle,
  actions,
  className,
}: ManageSubpageHeaderProps) {
  return (
    <AppPageHeader
      title={title}
      subtitle={subtitle}
      backHref="/setup"
      backLabel="Manage"
      actions={actions}
      className={className}
    />
  );
}
