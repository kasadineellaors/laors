import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCowCalfShipping } from "@/lib/cow-calf/shipping-queries";
import {
  SHIPPING_DIRECTION_LABELS,
  SHIPPING_REASON_LABELS,
} from "@/lib/cow-calf/shipping-constants";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Shipping — Cow-Calf — LAORS",
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CowCalfShippingPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const records = await listCowCalfShipping(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AppPageHeader
          title="Shipping"
          subtitle="Document cattle moving in or out — separate from sales and invoicing."
        />
        {canManage ? (
          <Link href="/cow-calf/shipping/new">
            <Button size="lg">+ Ship cattle</Button>
          </Link>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No shipping records yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4">
              <p className="font-semibold text-navy">
                {SHIPPING_DIRECTION_LABELS[r.direction]} · {r.head_count} head
                {r.weight_lbs != null ? ` · ${r.weight_lbs.toLocaleString()} lb` : ""}
              </p>
              <p className="text-sm text-text-secondary">
                {formatDate(r.shipped_at)} · {SHIPPING_REASON_LABELS[r.reason]}
                {r.herd_name ? ` · ${r.herd_name}` : ""}
                {r.lot_name ? ` · Lot ${r.lot_name}` : ""}
              </p>
              {r.source_name || r.destination_name ? (
                <p className="mt-1 text-xs text-text-secondary">
                  {[r.source_name, r.destination_name].filter(Boolean).join(" → ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
