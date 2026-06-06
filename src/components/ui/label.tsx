import { cn } from "@/lib/utils/cn";
import { LabelHTMLAttributes } from "react";

export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block text-sm font-semibold text-charcoal",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
