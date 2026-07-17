"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SelectOption } from "@/lib/locations/options";
import {
  archiveLotLabel,
  createLotLabel,
  updateLotLabel,
} from "@/lib/actions/lot-labels";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LotLabelsClientProps {
  orgId: string;
  items: SelectOption[];
}

export function LotLabelsClient({ orgId, items }: LotLabelsClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createLotLabel(orgId, name);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lot names</CardTitle>
        <CardDescription>
          Saved lot names appear as suggestions when receiving cattle. You can still type a new
          name on the receive form.
        </CardDescription>
      </CardHeader>
      <div className="px-4 pb-4">
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No saved lot names yet — add common lot IDs like Lot 1, Lot 2, or your naming scheme.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <SetupEditableRow
                key={item.value}
                fields={[{ key: "name", label: "Lot name", value: item.label }]}
                onSave={async (values) => updateLotLabel(orgId, item.value, values.name)}
                onArchive={async () => archiveLotLabel(orgId, item.value)}
              />
            ))}
          </ul>
        )}
        <form onSubmit={handleAdd} className="mt-3 flex gap-2 border-t border-border-neutral pt-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor="add-lot-label" className="sr-only">
              Add lot name
            </Label>
            <Input
              id="add-lot-label"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lot 1"
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            Add
          </Button>
        </form>
        {error ? <p className="mt-2 text-xs text-status-critical">{error}</p> : null}
      </div>
    </Card>
  );
}
