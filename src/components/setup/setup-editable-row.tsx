"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

export interface EditableField {
  key: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
}

interface SetupEditableRowProps {
  badge?: string;
  fields: EditableField[];
  onSave: (values: Record<string, string>) => Promise<ActionState>;
  onArchive?: () => Promise<ActionState>;
  archiveLabel?: string;
}

export function SetupEditableRow({
  badge,
  fields,
  onSave,
  onArchive,
  archiveLabel = "Archive",
}: SetupEditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.value])));
    setEditing(false);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await onSave(values);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  async function handleArchive() {
    if (!onArchive) return;
    if (!window.confirm(`Archive this item? You can add a replacement with a new name.`)) return;
    setLoading(true);
    setError(null);
    const result = await onArchive();
    setLoading(false);
    if (result.error) setError(result.error);
  }

  const primaryField = fields[0];

  if (!editing) {
    return (
      <li className="flex items-start justify-between gap-3 rounded-lg border border-border-neutral bg-tan/15 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">{primaryField?.value}</p>
          {fields.slice(1).map((f) =>
            f.value ? (
              <p key={f.key} className="text-xs text-text-secondary">
                {f.label}: {f.value}
              </p>
            ) : null,
          )}
          {error ? <p className="mt-1 text-xs text-status-critical">{error}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="text-xs uppercase tracking-wide text-text-secondary">{badge}</span>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border-2 border-navy/20 bg-surface-white px-4 py-3">
      <form onSubmit={handleSave} className="space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              maxLength={f.maxLength}
              required={f.key === primaryField?.key}
            />
          </div>
        ))}
        {error ? <p className="text-sm text-status-critical">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={loading}>
            Cancel
          </Button>
          {onArchive ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className={cn("ml-auto")}
              onClick={handleArchive}
              disabled={loading}
            >
              {archiveLabel}
            </Button>
          ) : null}
        </div>
      </form>
    </li>
  );
}
