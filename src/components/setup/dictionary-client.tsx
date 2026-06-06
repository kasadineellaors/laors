"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { DictionaryTable } from "@/lib/actions/ranch-config";
import {
  updateDictionaryEntry,
  archiveDictionaryEntry,
  createDictionaryEntry,
} from "@/lib/actions/ranch-config";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DictionarySectionConfig {
  title: string;
  table: DictionaryTable;
  items: SelectOption[];
  categoryType?: "income" | "expense" | "cost_of_goods";
}

interface DictionaryClientProps {
  orgId: string;
  sections: DictionarySectionConfig[];
}

function AddDictionaryItem({
  orgId,
  table,
  categoryType,
  onAdded,
}: {
  orgId: string;
  table: DictionaryTable;
  categoryType?: "income" | "expense" | "cost_of_goods";
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createDictionaryEntry(orgId, table, name, categoryType);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2 border-t border-border pt-3">
      <div className="min-w-0 flex-1">
        <Label htmlFor={`add-${table}`} className="sr-only">
          Add item
        </Label>
        <Input
          id={`add-${table}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add new…"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        Add
      </Button>
      {error ? <p className="w-full text-xs text-rust">{error}</p> : null}
    </form>
  );
}

export function DictionaryClient({ orgId, sections }: DictionaryClientProps) {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((section) => (
        <Card key={section.table}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.items.length} items — tap Edit to change</CardDescription>
          </CardHeader>
          <ul className="space-y-1">
            {section.items.length === 0 ? (
              <li className="px-2 text-sm text-charcoal/60">No items yet</li>
            ) : (
              section.items.map((item) => (
                <SetupEditableRow
                  key={item.value}
                  fields={[{ key: "name", label: "Name", value: item.label }]}
                  onSave={async (values) => {
                    const result = await updateDictionaryEntry(
                      orgId,
                      section.table,
                      item.value,
                      values.name,
                    );
                    if (!result.error) router.refresh();
                    return result;
                  }}
                  onArchive={async () => {
                    const result = await archiveDictionaryEntry(
                      orgId,
                      section.table,
                      item.value,
                    );
                    if (!result.error) router.refresh();
                    return result;
                  }}
                />
              ))
            )}
          </ul>
          <div className="px-4 pb-4">
            <AddDictionaryItem
              orgId={orgId}
              table={section.table}
              categoryType={section.categoryType}
              onAdded={() => router.refresh()}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
