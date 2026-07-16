import { cn } from "@/lib/utils/cn";
import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  /** Wrapper width — defaults to full width. Use e.g. `shrink-0 w-28` beside labels. */
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, error, type = "text", ...props }, ref) => (
    <div className={cn("w-full", wrapperClassName)}>
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-button)] border border-border-neutral bg-surface-white px-4 text-base text-text-primary",
          "placeholder:text-text-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:border-navy",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-status-critical focus-visible:ring-status-critical",
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  ),
);

Input.displayName = "Input";
