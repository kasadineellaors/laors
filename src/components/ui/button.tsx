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
    "bg-olive text-white hover:bg-olive-dark active:bg-olive-dark focus-visible:ring-olive",
  secondary:
    "bg-saddle text-white hover:bg-saddle-dark active:bg-saddle-dark focus-visible:ring-saddle",
  outline:
    "border-2 border-olive text-olive bg-transparent hover:bg-olive/10 focus-visible:ring-olive",
  ghost:
    "bg-transparent text-charcoal hover:bg-tan-light/60 focus-visible:ring-charcoal",
  danger:
    "bg-rust text-white hover:bg-rust/90 focus-visible:ring-rust",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm rounded-md",
  md: "h-12 px-5 text-base rounded-lg",
  lg: "h-14 px-6 text-lg rounded-lg",
  xl: "h-16 px-8 text-xl rounded-xl touch-target",
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
        "inline-flex items-center justify-center font-semibold transition-colors",
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
