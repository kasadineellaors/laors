"use client";

import { useState } from "react";
import type { FeedItemOption } from "@/lib/feed/inventory-types";
import type { FeedRationIngredient } from "@/lib/feed/inventory-types";
import { inclusionToQuantity } from "@/lib/feed/costing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type IngredientLine = {
  feedItemId: string;
  quantityPerRationUnit: string;
  inclusionPercent: string;
};

export type IngredientBuildMode = "amount" | "percent";

interface RationIngredientBuilderProps {
  feedItems: FeedItemOption[];
  rationUnit: string;
  lines: IngredientLine[];
  onChange: (lines: IngredientLine[]) => void;
  mode: IngredientBuildMode;
  onModeChange: (mode: IngredientBuildMode) => void;
}

export function linesFromIngredients(ingredients: FeedRationIngredient[]): IngredientLine[] {
  return ingredients.map((i) => ({
    feedItemId: i.feed_item_id,
    quantityPerRationUnit: String(i.quantity_per_ration_unit),
    inclusionPercent:
      i.inclusion_percent != null ? String(i.inclusion_percent) : "",
  }));
}

export function detectIngredientMode(ingredients: FeedRationIngredient[]): IngredientBuildMode {
  if (ingredients.some((i) => i.inclusion_percent != null)) return "percent";
  return "amount";
}

export function parseIngredientLines(
  lines: IngredientLine[],
  mode: IngredientBuildMode,
): Array<{
  feedItemId: string;
  quantityPerRationUnit: number;
  inclusionPercent?: number | null;
}> {
  return lines
    .filter((l) => l.feedItemId)
    .map((l) => {
      if (mode === "percent") {
        const pct = parseFloat(l.inclusionPercent);
        if (Number.isNaN(pct) || pct <= 0) return null;
        return {
          feedItemId: l.feedItemId,
          quantityPerRationUnit: inclusionToQuantity(pct),
          inclusionPercent: pct,
        };
      }
      const qty = parseFloat(l.quantityPerRationUnit);
      if (Number.isNaN(qty) || qty <= 0) return null;
      return {
        feedItemId: l.feedItemId,
        quantityPerRationUnit: qty,
        inclusionPercent: null,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
}

function computePercentTotal(lines: IngredientLine[]): number {
  return lines.reduce((sum, l) => {
    const pct = parseFloat(l.inclusionPercent);
    return sum + (Number.isNaN(pct) ? 0 : pct);
  }, 0);
}

function computeRecipeCost(lines: IngredientLine[], feedItems: FeedItemOption[]): number {
  return lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantityPerRationUnit);
    const pct = parseFloat(l.inclusionPercent);
    const item = feedItems.find((f) => f.id === l.feedItemId);
    const price = item?.price_per_unit ?? 0;
    const amount = !Number.isNaN(qty) && qty > 0 ? qty : !Number.isNaN(pct) && pct > 0 ? pct / 100 : 0;
    return sum + amount * price;
  }, 0);
}

export function RationIngredientBuilder({
  feedItems,
  rationUnit,
  lines,
  onChange,
  mode,
  onModeChange,
}: RationIngredientBuilderProps) {
  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  const percentTotal = mode === "percent" ? computePercentTotal(lines) : 0;
  const percentOk = Math.abs(percentTotal - 100) < 0.01;
  const recipeCost = computeRecipeCost(lines, feedItems);

  function updateLine(index: number, patch: Partial<IngredientLine>) {
    const next = lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange(next);
  }

  function addLine() {
    onChange([
      ...lines,
      { feedItemId: feedItems[0]?.id ?? "", quantityPerRationUnit: "", inclusionPercent: "" },
    ]);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  if (feedItems.length === 0) {
    return (
      <p className="rounded-lg bg-tan-light/40 px-4 py-3 text-sm text-text-secondary">
        Add feedstuff to inventory first, then build this ration from what you have on hand.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Recipe — per 1 {rationUnit} of this ration</Label>
          <p className="text-xs text-text-secondary">
            Logging feed deducts these amounts from inventory automatically.
          </p>
        </div>
        <div className="flex rounded-lg border border-border-neutral p-0.5 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-semibold ${
              mode === "amount" ? "bg-navy text-white" : "text-text-secondary"
            }`}
            onClick={() => onModeChange("amount")}
          >
            By amount
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-semibold ${
              mode === "percent" ? "bg-navy text-white" : "text-text-secondary"
            }`}
            onClick={() => onModeChange("percent")}
          >
            By %
          </button>
        </div>
      </div>

      {mode === "percent" ? (
        <p
          className={`text-sm font-semibold ${percentOk ? "text-brown" : "text-status-critical"}`}
        >
          Inclusion total: {percentTotal.toFixed(3).replace(/\.?0+$/, "")}%
          {!percentOk ? " — should equal 100%" : ""}
        </p>
      ) : null}

      {recipeCost > 0 ? (
        <p className="text-sm text-text-secondary">
          Estimated recipe cost:{" "}
          <span className="font-bold text-navy">
            ${recipeCost.toFixed(2)}/{rationUnit}
          </span>
        </p>
      ) : null}

      {lines.map((line, index) => {
        const item = feedItems.find((f) => f.id === line.feedItemId);
        return (
          <div
            key={index}
            className={`grid items-end gap-2 ${
              mode === "percent" ? "grid-cols-[1fr_100px_auto]" : "grid-cols-[1fr_120px_auto]"
            }`}
          >
            <div>
              <Label className="sr-only">Feedstuff</Label>
              <select
                value={line.feedItemId}
                onChange={(e) => updateLine(index, { feedItemId: e.target.value })}
                className={selectClass}
              >
                {feedItems.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.price_per_unit != null ? ` — $${f.price_per_unit}/${f.unit}` : ""}
                    {" "}({f.quantity_on_hand} {f.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="sr-only">{mode === "percent" ? "Percent" : "Amount"}</Label>
              {mode === "percent" ? (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  inputMode="decimal"
                  value={line.inclusionPercent}
                  onChange={(e) => updateLine(index, { inclusionPercent: e.target.value })}
                  placeholder="%"
                  aria-label={`Inclusion % for ${item?.name ?? "feedstuff"}`}
                />
              ) : (
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={line.quantityPerRationUnit}
                  onChange={(e) => updateLine(index, { quantityPerRationUnit: e.target.value })}
                  placeholder="Qty"
                  aria-label={`Amount of ${item?.name ?? "feedstuff"}`}
                />
              )}
              <p className="mt-0.5 text-xs text-text-secondary">
                {mode === "percent" ? "% of ration" : (item?.unit ?? "units")}
              </p>
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
