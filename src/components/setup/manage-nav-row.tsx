import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface ManageNavRowProps {
  href: string;
  title: string;
  description: string;
}

export function ManageNavRow({ href, title, description }: ManageNavRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-3 transition-all",
        "hover:border-navy/25 hover:bg-tan/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
        "cursor-pointer",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-text-secondary">{description}</p>
      </div>
      <span
        className="shrink-0 text-lg text-text-secondary transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        ›
      </span>
    </Link>
  );
}
