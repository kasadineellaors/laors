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
          "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base text-charcoal",
          "placeholder:text-charcoal/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive focus-visible:border-olive",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-rust focus-visible:ring-rust",
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  ),
);

Input.displayName = "Input";
