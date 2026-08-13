"use client";

import Link from "next/link";
import { linkButtonClassName } from "@/components/ui/button";

export type QuickAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "outline" | "secondary";
};

interface QuickActionGroupProps {
  title: string;
  actions: QuickAction[];
}

export function QuickActionGroup({ title, actions }: QuickActionGroupProps) {
  if (actions.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const className = linkButtonClassName({
            variant: action.variant ?? "outline",
            size: "md",
            fullWidth: true,
            className: "h-11 min-h-11",
          });

          if (action.onClick) {
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={className}
              >
                {action.label}
              </button>
            );
          }

          return (
            <Link key={action.label} href={action.href ?? "#"} className={className}>
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
