"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomerOption } from "@/lib/customers/types";
import type { SelectOption } from "@/lib/locations/options";
import type { SaleRecord } from "@/lib/sales/types";
import { SEEDSTOCK_SALE_TYPE_LABELS } from "@/lib/seedstock/constants";
import { archiveSale } from "@/lib/actions/sales";
import { createInvoiceFromSale } from "@/lib/actions/invoices";
import { SaleForm } from "@/components/sales/sale-form";
import { Button } from "@/components/ui/button";

interface SaleDetailClientProps {
  orgId: string;
  sale: SaleRecord;
  locationOptions: SelectOption[];
  categoryOptions: SelectOption[];
  customerOptions?: CustomerOption[];
  canCreateInvoice?: boolean;
  canDeductInventory?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number | null) {
  if (amount == null) return "—";
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function SaleDetailClient({
  orgId,
  sale,
  locationOptions,
  categoryOptions,
  customerOptions = [],
  canCreateInvoice,
  canDeductInventory = false,
}: SaleDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateInvoice() {
    setLoading(true);
    setError(null);
    const result = await createInvoiceFromSale(orgId, sale.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.invoiceId) router.push(`/invoices/${result.invoiceId}`);
  }

  async function handleArchive() {
    if (!window.confirm("Archive this sale record? Head sold stay out of inventory.")) {
      return;
    }
    setLoading(true);
    const result = await archiveSale(orgId, sale.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/sales");
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Link href="/sales" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Sales
        </Link>
        <SaleForm
          orgId={orgId}
          sale={sale}
          locationOptions={locationOptions}
          groupOptions={[]}
          categoryOptions={categoryOptions}
          customerOptions={customerOptions}
          canDeductInventory={canDeductInventory}
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
      <Link href="/sales" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← Sales
      </Link>

      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-5">
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          {sale.head_count} head sold
        </h1>
        {sale.buyer_name ? (
          <p className="mt-1 text-text-secondary">Buyer: {sale.buyer_name}</p>
        ) : null}
        <p className="mt-2 text-3xl font-bold text-brown">{formatMoney(sale.total_amount)}</p>
        <p className="text-sm text-text-secondary">{formatDate(sale.sale_date)}</p>

        <dl className="mt-6 space-y-3 text-sm">
          {sale.seedstock_sale_type ? (
            <div>
              <dt className="text-text-secondary">Sale type</dt>
              <dd className="font-medium text-navy">
                {SEEDSTOCK_SALE_TYPE_LABELS[sale.seedstock_sale_type]}
              </dd>
            </div>
          ) : null}
          {sale.individual_animal_id && sale.individual_animal_tag ? (
            <div>
              <dt className="text-text-secondary">Animal</dt>
              <dd>
                <Link
                  href={`/seedstock/animals/${sale.individual_animal_id}`}
                  className="font-medium text-brown hover:underline"
                >
                  {sale.individual_animal_tag}
                </Link>
              </dd>
            </div>
          ) : null}
          {sale.customer_name ? (
            <div>
              <dt className="text-text-secondary">Customer</dt>
              <dd className="font-medium text-navy">{sale.customer_name}</dd>
            </div>
          ) : null}
          {sale.price_per_head != null ? (
            <div>
              <dt className="text-text-secondary">Per head</dt>
              <dd className="font-medium text-navy">{formatMoney(sale.price_per_head)}</dd>
            </div>
          ) : null}
          {sale.avg_weight_lbs != null ? (
            <div>
              <dt className="text-text-secondary">Avg out weight</dt>
              <dd className="font-medium text-navy">{Math.round(sale.avg_weight_lbs)} lb</dd>
            </div>
          ) : null}
          {sale.cattle_group_name ? (
            <div>
              <dt className="text-text-secondary">Group</dt>
              <dd className="font-medium text-navy">{sale.cattle_group_name}</dd>
            </div>
          ) : null}
          {sale.inventory_deducted ? (
            <div>
              <dt className="text-text-secondary">Inventory</dt>
              <dd className="font-medium text-brown">Deducted from group</dd>
            </div>
          ) : null}
          {sale.financial_category_name ? (
            <div>
              <dt className="text-text-secondary">Category</dt>
              <dd className="font-medium text-navy">{sale.financial_category_name}</dd>
            </div>
          ) : null}
          {sale.location_label ? (
            <div>
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium text-navy">{sale.location_label}</dd>
            </div>
          ) : null}
          {sale.notes ? (
            <div>
              <dt className="text-text-secondary">Notes</dt>
              <dd className="font-medium text-navy">{sale.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-text-secondary">
        Archiving removes this sale record only. Head sold stay out of inventory.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {canCreateInvoice ? (
          <Button size="lg" variant="secondary" onClick={handleCreateInvoice} disabled={loading}>
            Create invoice
          </Button>
        ) : null}
        <Button size="lg" onClick={() => setEditing(true)} disabled={loading}>
          Edit
        </Button>
        <Button variant="outline" size="lg" onClick={handleArchive} disabled={loading}>
          Archive
        </Button>
      </div>
    </div>
  );
}
