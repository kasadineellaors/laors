"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeedRationRecord } from "@/lib/feed/types";
import type { FeedItemOption, FeedRationIngredient } from "@/lib/feed/inventory-types";
import { computeRationRecipeCost, resolveRationUnitPrice } from "@/lib/feed/costing";
import { archiveFeedRation } from "@/lib/actions/feed";
import { RationForm } from "@/components/feed/ration-form";
import { Button } from "@/components/ui/button";

interface RationDetailClientProps {
  orgId: string;
  ration: FeedRationRecord;
  canManage: boolean;
  feedItems: FeedItemOption[];
  ingredients: FeedRationIngredient[];
}

export function RationDetailClient({
  orgId,
  ration,
  canManage,
  feedItems,
  ingredients,
}: RationDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!window.confirm("Archive this feed ration?")) return;
    setLoading(true);
    const result = await archiveFeedRation(orgId, ration.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/feed/rations");
  }

  const recipeCost = computeRationRecipeCost(ingredients);
  const billRate = resolveRationUnitPrice(ration.price_per_unit, ingredients);

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href="/feed/rations" className="text-sm font-medium text-olive hover:underline">
          ← Rations
        </Link>
        <RationForm
          orgId={orgId}
          ration={ration}
          feedItems={feedItems}
          ingredients={ingredients}
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/feed/rations" className="text-sm font-medium text-olive hover:underline">
        ← Rations
      </Link>

      <div className="rounded-xl border border-border bg-surface px-4 py-5">
        <h1 className="text-2xl font-bold text-charcoal">{ration.name}</h1>
        <p className="mt-1 text-charcoal/70 capitalize">Fed in {ration.unit}</p>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-charcoal/50">Bill at</dt>
            <dd className="font-medium text-charcoal">
              {billRate > 0
                ? `$${billRate.toFixed(2)}/${ration.unit}`
                : "Not set — add recipe or manual price"}
              {ration.price_per_unit == null && recipeCost > 0 ? " (from recipe)" : ""}
            </dd>
          </div>
          {recipeCost > 0 ? (
            <div>
              <dt className="text-charcoal/50">Recipe cost</dt>
              <dd className="font-medium text-charcoal">
                ${recipeCost.toFixed(2)}/{ration.unit}
              </dd>
            </div>
          ) : null}
          {ingredients.length > 0 ? (
            <div>
              <dt className="text-charcoal/50">Recipe per 1 {ration.unit}</dt>
              <dd className="mt-1 space-y-1">
                {ingredients.map((i) => (
                  <p key={i.id} className="font-medium text-charcoal">
                    {i.inclusion_percent != null
                      ? `${i.inclusion_percent}%`
                      : `${i.quantity_per_ration_unit}`}{" "}
                    {i.feed_item_unit} {i.feed_item_name}
                  </p>
                ))}
              </dd>
            </div>
          ) : (
            <p className="text-charcoal/60">No inventory recipe — edit to pull from feedstuff.</p>
          )}
          {ration.notes ? (
            <div>
              <dt className="text-charcoal/50">Notes</dt>
              <dd className="font-medium text-charcoal">{ration.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => setEditing(true)} disabled={loading}>
            Edit
          </Button>
          <Button variant="outline" size="lg" onClick={handleArchive} disabled={loading}>
            Archive
          </Button>
        </div>
      ) : null}
    </div>
  );
}
