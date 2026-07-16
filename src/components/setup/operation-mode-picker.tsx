"use client";

import {
  OPERATION_MODES,
  OPERATION_MODE_DESCRIPTIONS,
  OPERATION_MODE_LABELS,
  type OperationMode,
} from "@/types/auth";
import { cn } from "@/lib/utils/cn";

interface OperationModePickerProps {
  value: OperationMode[];
  onChange: (modes: OperationMode[]) => void;
  disabled?: boolean;
}

export function OperationModePicker({ value, onChange, disabled }: OperationModePickerProps) {
  function toggle(mode: OperationMode) {
    if (disabled) return;
    onChange(
      value.includes(mode) ? value.filter((m) => m !== mode) : [...value, mode],
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Turn on every enterprise you run. You can change these anytime — LAORS shows tabs and tools
        for each module you enable.
      </p>
      <div
        className="grid gap-3 sm:grid-cols-3"
        role="group"
        aria-label="Operation modules"
      >
        {OPERATION_MODES.map((mode) => {
          const selected = value.includes(mode);
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggle(mode)}
              className={cn(
                "flex min-h-[7.5rem] flex-col rounded-xl border-2 p-4 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? "border-navy bg-navy/10 shadow-[inset_0_0_0_1px_rgba(30,58,95,0.15)]"
                  : "border-border-neutral bg-surface-white hover:border-navy/40 hover:bg-tan/10",
              )}
            >
              <span className="mb-2 flex items-start justify-between gap-2">
                <span className="text-base font-bold text-navy">
                  {OPERATION_MODE_LABELS[mode]}
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold",
                    selected
                      ? "border-navy bg-navy text-white"
                      : "border-border-neutral bg-surface-white text-transparent",
                  )}
                  aria-hidden
                >
                  ✓
                </span>
              </span>
              <span className="text-sm leading-snug text-text-secondary">
                {OPERATION_MODE_DESCRIPTIONS[mode]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-text-secondary">
        {value.length === 0
          ? "Select at least one module to continue."
          : `${value.length} module${value.length === 1 ? "" : "s"} enabled: ${value
              .map((m) => OPERATION_MODE_LABELS[m])
              .join(", ")}`}
      </p>
    </div>
  );
}
