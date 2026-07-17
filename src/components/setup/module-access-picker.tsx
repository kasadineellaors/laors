"use client";

import type { SystemRole } from "@/types/database";
import {
  APP_MODULE_DEFS,
  ROLE_MODULE_PRESETS,
  type AppModuleId,
} from "@/lib/auth/modules";
import { Label } from "@/components/ui/label";

interface ModuleAccessPickerProps {
  role: SystemRole;
  selected: AppModuleId[];
  onChange: (modules: AppModuleId[]) => void;
  disabled?: boolean;
}

export function ModuleAccessPicker({
  role,
  selected,
  onChange,
  disabled,
}: ModuleAccessPickerProps) {
  function toggle(moduleId: AppModuleId) {
    if (disabled) return;
    if (selected.includes(moduleId)) {
      onChange(selected.filter((id) => id !== moduleId));
    } else {
      onChange([...selected, moduleId]);
    }
  }

  function applyRolePreset() {
    if (disabled) return;
    onChange([...ROLE_MODULE_PRESETS[role]]);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border-neutral bg-cream/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">What they can see</p>
          <p className="text-xs text-text-secondary">
            Role still controls what they can edit. Uncheck areas to hide from their menu.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-semibold text-brown hover:underline disabled:opacity-50"
          onClick={applyRolePreset}
          disabled={disabled}
        >
          Reset to role default
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {APP_MODULE_DEFS.map((module) => {
          const checked = selected.includes(module.id);
          return (
            <label
              key={module.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-neutral bg-surface-white px-3 py-2.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border-neutral text-navy focus:ring-navy"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(module.id)}
              />
              <span>
                <span className="block text-sm font-medium text-navy">{module.label}</span>
                <span className="block text-xs text-text-secondary">{module.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {selected.length === 0 ? (
        <p className="text-xs text-status-warning" role="alert">
          Select at least one area — otherwise they will only see Home after joining.
        </p>
      ) : (
        <Label className="text-xs font-normal text-text-secondary">
          {selected.length} area{selected.length === 1 ? "" : "s"} selected
        </Label>
      )}
    </div>
  );
}
