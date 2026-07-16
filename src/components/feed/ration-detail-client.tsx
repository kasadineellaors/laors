"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeedRationRecord } from "@/lib/feed/types";
import type { FeedItemOption, FeedRationIngredient, FeedRationPriceHistory } from "@/lib/feed/inventory-types";
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
  priceHistory?: FeedRationPriceHistory[];
}

export function RationDetailClient({
  orgId,
  ration,
  canManage,
  feedItems,
  ingredients,
  priceHistory = [],
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
        <Link href="/feed/rations" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
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
      <Link href="/feed/rations" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← Rations
      </Link>

      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-5">
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">{ration.name}</h1>
        <p className="mt-1 text-text-secondary capitalize">Fed in {ration.unit}</p>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-text-secondary">Bill at</dt>
            <dd className="font-medium text-navy">
              {billRate > 0
                ? `$${billRate.toFixed(2)}/${ration.unit}`
                : "Not set — add recipe or manual price"}
              {ration.price_per_unit == null && recipeCost > 0 ? " (from recipe)" : ""}
            </dd>
          </div>
          {ration.effective_from ? (
            <div>
              <dt className="text-text-secondary">Current price since</dt>
              <dd className="font-medium text-navy">
                {new Date(ration.effective_from + "T12:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
          ) : null}
          {recipeCost > 0 ? (
            <div>
              <dt className="text-text-secondary">Recipe cost</dt>
              <dd className="font-medium text-navy">
                ${recipeCost.toFixed(2)}/{ration.unit}
              </dd>
            </div>
          ) : null}
          {ingredients.length > 0 ? (
            <div>
              <dt className="text-text-secondary">Recipe per 1 {ration.unit}</dt>
              <dd className="mt-1 space-y-1">
                {ingredients.map((i) => (
                  <p key={i.id} className="font-medium text-navy">
                    {i.inclusion_percent != null
                      ? `${i.inclusion_percent}%`
                      : `${i.quantity_per_ration_unit}`}{" "}
                    {i.feed_item_unit} {i.feed_item_name}
                  </p>
                ))}
              </dd>
            </div>
          ) : (
            <p className="text-text-secondary">No inventory recipe — edit to pull from feedstuff.</p>
          )}
          {ration.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="font-medium text-navy">{ration.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {priceHistory.length > 0 ? (
        <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-5">
          <h2 className="text-lg font-semibold text-navy">Price history</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {priceHistory.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
              >
                <span className="text-text-secondary">
                  {new Date(row.effective_from + "T12:00:00").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="font-medium text-navy">
                  ${row.price_per_unit.toFixed(2)}/{ration.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
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
