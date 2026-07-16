import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface ManageNavCardProps {
  href: string;
  title: string;
  description: string;
}

export function ManageNavCard({ href, title, description }: ManageNavCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[5.5rem] flex-col rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)] transition-all",
        "hover:border-navy/25 hover:shadow-[0_4px_12px_rgba(39,66,93,0.12)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
        "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        <span
          className="text-lg text-text-secondary transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          ›
        </span>
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </Link>
  );
}
