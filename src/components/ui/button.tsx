import { cn } from "@/lib/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brown text-white hover:bg-brown-dark active:bg-brown-dark focus-visible:ring-brown",
  secondary:
    "bg-navy text-white hover:bg-navy-dark active:bg-navy-dark focus-visible:ring-navy",
  outline:
    "border border-navy text-navy bg-transparent hover:bg-tan/40 focus-visible:ring-navy",
  ghost:
    "bg-transparent text-text-primary hover:bg-tan/30 focus-visible:ring-navy",
  danger:
    "bg-status-critical text-white hover:bg-status-critical/90 focus-visible:ring-status-critical",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 min-h-10 px-4 text-sm rounded-[var(--radius-button)]",
  md: "h-11 min-h-11 px-5 text-sm rounded-[var(--radius-button)]",
  lg: "h-12 min-h-12 px-6 text-base rounded-[var(--radius-button)]",
  xl: "h-14 min-h-14 px-8 text-lg rounded-[var(--radius-button)] touch-target",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      type = "button",
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
