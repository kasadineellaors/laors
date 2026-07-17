"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LotPurchaseRecord } from "@/lib/lots/purchase-types";
import { archiveLotPurchase } from "@/lib/actions/lot-purchases";
import type { RanchFieldSuggestions } from "@/lib/ranch/field-suggestions";
import { LotPurchaseForm } from "@/components/lots/lot-purchase-form";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LotPurchaseHistoryProps {
  orgId: string;
  groupId: string;
  purchases: LotPurchaseRecord[];
  canManage: boolean;
  fieldSuggestions: Pick<RanchFieldSuggestions, "sellers" | "sources">;
}

function money(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function LotPurchaseHistory({
  orgId,
  groupId,
  purchases,
  canManage,
  fieldSuggestions,
}: LotPurchaseHistoryProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingPurchase = editingId
    ? purchases.find((purchase) => purchase.id === editingId)
    : undefined;

  async function handleRemove(purchaseId: string) {
    if (!window.confirm("Remove this purchase receipt? Head on the lot will be adjusted.")) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await archiveLotPurchase(orgId, groupId, purchaseId);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      if (editingId === purchaseId) setEditingId(null);
      router.refresh();
    }
  }

  const totalHead = purchases.reduce((sum, p) => sum + p.head_count, 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.landed_cost ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase history</CardTitle>
        <CardDescription>
          Each receive or initial load is saved as a purchase receipt — what this lot is made of.
          {purchases.length > 0
            ? ` ${totalHead} head received · ${money(totalCost)} cattle cost`
            : ""}
        </CardDescription>
      </CardHeader>

      {purchases.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-text-secondary">
          No purchase receipts yet. Receive cattle to build this lot&apos;s history.
        </p>
      ) : (
        <ul className="space-y-2 px-4 pb-4 text-sm">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="rounded-lg border border-border-neutral px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-medium">{purchase.purchased_at}</span>
                  {": "}
                  {purchase.head_count} head
                  {purchase.landed_cost != null ? ` · ${money(purchase.landed_cost)}` : ""}
                  <span className="block text-xs text-text-secondary">
                    {purchase.seller_name ? purchase.seller_name : "Seller not recorded"}
                    {purchase.source_name ? ` · ${purchase.source_name}` : ""}
                    {purchase.invoice_ref ? ` · #${purchase.invoice_ref}` : ""}
                    {purchase.pay_weight_lbs != null
                      ? ` · ${Math.round(purchase.pay_weight_lbs).toLocaleString()} lb pay`
                      : ""}
                    {purchase.received_weight_lbs != null
                      ? ` · ${Math.round(purchase.received_weight_lbs).toLocaleString()} lb received`
                      : ""}
                    {purchase.purchase_price_per_lb != null
                      ? ` · $${purchase.purchase_price_per_lb.toFixed(4)}/lb`
                      : ""}
                    {purchase.notes ? ` · ${purchase.notes}` : ""}
                  </span>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(purchase.id)}
                      disabled={loading}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(purchase.id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingPurchase ? (
        <div className="px-4 pb-4">
          <LotPurchaseForm
            orgId={orgId}
            groupId={groupId}
            purchase={editingPurchase}
            fieldSuggestions={fieldSuggestions}
            onSuccess={() => {
              setEditingId(null);
              router.refresh();
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      ) : null}

      {error ? (
        <p className="px-4 pb-4 text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
