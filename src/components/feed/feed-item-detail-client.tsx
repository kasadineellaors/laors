"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeedItemRecord, FeedPurchaseRecord, FeedStockAdjustment } from "@/lib/feed/inventory-types";
import { adjustFeedStock, archiveFeedItem, archiveFeedPurchase } from "@/lib/actions/feed-inventory";
import { FeedItemForm } from "@/components/feed/feed-item-form";
import { FeedPurchaseForm } from "@/components/feed/feed-purchase-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FeedItemDetailClientProps {
  orgId: string;
  item: FeedItemRecord;
  adjustments: FeedStockAdjustment[];
  purchases: FeedPurchaseRecord[];
  supplierSuggestions: string[];
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FeedItemDetailClient({
  orgId,
  item,
  adjustments,
  purchases,
  supplierSuggestions,
}: FeedItemDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adjustMode, setAdjustMode] = useState<"receive" | "use" | "purchase" | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdjust(type: "receive" | "use") {
    const qty = parseFloat(adjustQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Enter a positive quantity");
      return;
    }
    setLoading(true);
    setError(null);
    const delta = type === "receive" ? qty : -qty;
    const result = await adjustFeedStock(orgId, item.id, {
      delta,
      adjustmentType: type,
      notes: adjustNotes || undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setAdjustMode(null);
      setAdjustQty("");
      setAdjustNotes("");
      router.refresh();
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archive "${item.name}"?`)) return;
    setLoading(true);
    const result = await archiveFeedItem(orgId, item.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/feed/inventory");
  }

  function startEditPurchase(purchaseId: string) {
    setEditingPurchaseId(purchaseId);
    setAdjustMode(null);
    setError(null);
  }

  function cancelPurchaseForm() {
    setAdjustMode(null);
    setEditingPurchaseId(null);
    setError(null);
  }

  async function handleArchivePurchase(purchaseId: string) {
    if (!window.confirm("Remove this purchase? Inventory on hand will be adjusted.")) return;
    setLoading(true);
    setError(null);
    const result = await archiveFeedPurchase(orgId, item.id, purchaseId);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      if (editingPurchaseId === purchaseId) cancelPurchaseForm();
      router.refresh();
    }
  }

  const editingPurchase = editingPurchaseId
    ? purchases.find((p) => p.id === editingPurchaseId)
    : undefined;

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href="/feed/inventory" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Feed inventory
        </Link>
        <FeedItemForm
          orgId={orgId}
          item={item}
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
      <Link href="/feed/inventory" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← Feed inventory
      </Link>

      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-5">
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">{item.name}</h1>
        <p className="text-sm text-text-secondary">
          {item.quantity_on_hand} {item.unit} on hand
          {item.price_per_unit != null ? ` · avg $${item.price_per_unit.toFixed(2)}/${item.unit}` : ""}
          {item.reorder_at != null ? ` · alert below ${item.reorder_at}` : ""}
        </p>
        {item.is_low_stock ? (
          <p className="mt-2 rounded-lg bg-status-critical/10 px-3 py-2 text-sm font-semibold text-status-critical">
            Low stock
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            setAdjustMode("purchase");
            setEditingPurchaseId(null);
            setError(null);
          }}
        >
          Record purchase
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            setAdjustMode("use");
            setError(null);
          }}
        >
          Use / adjust out
        </Button>
      </div>

      {adjustMode === "purchase" || editingPurchase ? (
        <FeedPurchaseForm
          orgId={orgId}
          itemId={item.id}
          unit={item.unit}
          supplierSuggestions={supplierSuggestions}
          purchase={editingPurchase}
          onSuccess={() => {
            cancelPurchaseForm();
            router.refresh();
          }}
          onCancel={cancelPurchaseForm}
        />
      ) : null}

      {adjustMode === "receive" || adjustMode === "use" ? (
        <div className="space-y-3 rounded-xl border border-border-neutral p-4">
          <Label htmlFor="adjQty">Quantity ({item.unit})</Label>
          <Input
            id="adjQty"
            type="number"
            min={0}
            step="0.01"
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
          />
          <Label htmlFor="adjNotes">Notes</Label>
          <Input
            id="adjNotes"
            value={adjustNotes}
            onChange={(e) => setAdjustNotes(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              disabled={loading}
              onClick={() => handleAdjust(adjustMode)}
            >
              Confirm
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setAdjustMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit details
        </Button>
        <Button variant="secondary" onClick={handleArchive} disabled={loading}>
          Archive
        </Button>
      </div>

      {purchases.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy">Purchase history</h2>
          <ul className="space-y-2 text-sm">
            {purchases.map((p) => (
              <li key={p.id} className="rounded-lg border border-border-neutral px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium">{p.purchased_at}</span>
                    {": "}
                    {p.quantity} {item.unit} for $
                    {p.total_cost.toFixed(2)}
                    <span className="block text-xs text-text-secondary">
                      ${p.unit_cost.toFixed(4)}/{item.unit}
                      {p.vendor_name ? ` · ${p.vendor_name}` : ""}
                      {p.invoice_ref ? ` · #${p.invoice_ref}` : ""}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditPurchase(p.id)}
                      disabled={loading}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchivePurchase(p.id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {adjustments.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy">Recent adjustments</h2>
          <ul className="space-y-2 text-sm">
            {adjustments.map((a) => (
              <li key={a.id} className="rounded-lg border border-border-neutral px-3 py-2">
                <span className="font-medium capitalize">{a.adjustment_type}</span>
                {": "}
                {a.delta > 0 ? "+" : ""}
                {a.delta} {item.unit} → {a.new_quantity} on hand
                <span className="block text-xs text-text-secondary">
                  {formatWhen(a.created_at)}
                  {a.created_by_name ? ` · ${a.created_by_name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
