"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface ArchivedToggleSectionProps {
  count: number;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function ArchivedToggleSection({
  count,
  label = "archived",
  children,
  className,
}: ArchivedToggleSectionProps) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className={cn("border-t border-border-neutral pt-4", className)}>
      <button
        type="button"
        className="text-sm font-semibold text-text-secondary hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "Hide" : "View"} {label} ({count})
      </button>
      {open ? <div className="mt-3 space-y-3 opacity-90">{children}</div> : null}
    </div>
  );
}
