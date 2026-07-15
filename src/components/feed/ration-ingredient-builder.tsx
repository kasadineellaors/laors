"use client";

import type { FeedItemOption } from "@/lib/feed/inventory-types";
import type { FeedRationIngredient } from "@/lib/feed/inventory-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type IngredientLine = {
  feedItemId: string;
  quantityPerRationUnit: string;
};

interface RationIngredientBuilderProps {
  feedItems: FeedItemOption[];
  rationUnit: string;
  lines: IngredientLine[];
  onChange: (lines: IngredientLine[]) => void;
}

export function linesFromIngredients(ingredients: FeedRationIngredient[]): IngredientLine[] {
  return ingredients.map((i) => ({
    feedItemId: i.feed_item_id,
    quantityPerRationUnit: String(i.quantity_per_ration_unit),
  }));
}

export function parseIngredientLines(
  lines: IngredientLine[],
): Array<{ feedItemId: string; quantityPerRationUnit: number }> {
  return lines
    .filter((l) => l.feedItemId && l.quantityPerRationUnit.trim())
    .map((l) => ({
      feedItemId: l.feedItemId,
      quantityPerRationUnit: parseFloat(l.quantityPerRationUnit),
    }))
    .filter((l) => !Number.isNaN(l.quantityPerRationUnit) && l.quantityPerRationUnit > 0);
}

export function RationIngredientBuilder({
  feedItems,
  rationUnit,
  lines,
  onChange,
}: RationIngredientBuilderProps) {
  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  function updateLine(index: number, patch: Partial<IngredientLine>) {
    const next = lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange(next);
  }

  function addLine() {
    onChange([
      ...lines,
      { feedItemId: feedItems[0]?.id ?? "", quantityPerRationUnit: "" },
    ]);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  if (feedItems.length === 0) {
    return (
      <p className="rounded-lg bg-tan-light/40 px-4 py-3 text-sm text-charcoal/70">
        Add feedstuff to inventory first, then build this ration from what you have on hand.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Recipe — per 1 {rationUnit} of this ration</Label>
        <p className="text-xs text-charcoal/60">
          Logging feed deducts these amounts from inventory automatically.
        </p>
      </div>
      {lines.map((line, index) => {
        const item = feedItems.find((f) => f.id === line.feedItemId);
        return (
          <div key={index} className="grid grid-cols-[1fr_120px_auto] items-end gap-2">
            <div>
              <Label className="sr-only">Feedstuff</Label>
              <select
                value={line.feedItemId}
                onChange={(e) => updateLine(index, { feedItemId: e.target.value })}
                className={selectClass}
              >
                {feedItems.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.quantity_on_hand} {f.unit} on hand)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="sr-only">Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={line.quantityPerRationUnit}
                onChange={(e) => updateLine(index, { quantityPerRationUnit: e.target.value })}
                placeholder="Qty"
                aria-label={`Amount of ${item?.name ?? "feedstuff"}`}
              />
              <p className="mt-0.5 text-xs text-charcoal/50">{item?.unit ?? "units"}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => removeLine(index)}>
              Remove
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="secondary" onClick={addLine}>
        + Add ingredient
      </Button>
    </div>
  );
}
