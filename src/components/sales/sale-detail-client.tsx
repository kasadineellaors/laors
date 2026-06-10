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
        <Link href="/sales" className="text-sm font-medium text-olive hover:underline">
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
      <Link href="/sales" className="text-sm font-medium text-olive hover:underline">
        ← Sales
      </Link>

      <div className="rounded-xl border border-border bg-surface px-4 py-5">
        <h1 className="text-2xl font-bold text-charcoal">
          {sale.head_count} head sold
        </h1>
        {sale.buyer_name ? (
          <p className="mt-1 text-charcoal/70">Buyer: {sale.buyer_name}</p>
        ) : null}
        <p className="mt-2 text-3xl font-bold text-olive">{formatMoney(sale.total_amount)}</p>
        <p className="text-sm text-charcoal/60">{formatDate(sale.sale_date)}</p>

        <dl className="mt-6 space-y-3 text-sm">
          {sale.seedstock_sale_type ? (
            <div>
              <dt className="text-charcoal/50">Sale type</dt>
              <dd className="font-medium text-charcoal">
                {SEEDSTOCK_SALE_TYPE_LABELS[sale.seedstock_sale_type]}
              </dd>
            </div>
          ) : null}
          {sale.individual_animal_id && sale.individual_animal_tag ? (
            <div>
              <dt className="text-charcoal/50">Animal</dt>
              <dd>
                <Link
                  href={`/seedstock/animals/${sale.individual_animal_id}`}
                  className="font-medium text-olive hover:underline"
                >
                  {sale.individual_animal_tag}
                </Link>
              </dd>
            </div>
          ) : null}
          {sale.customer_name ? (
            <div>
              <dt className="text-charcoal/50">Customer</dt>
              <dd className="font-medium text-charcoal">{sale.customer_name}</dd>
            </div>
          ) : null}
          {sale.price_per_head != null ? (
            <div>
              <dt className="text-charcoal/50">Per head</dt>
              <dd className="font-medium text-charcoal">{formatMoney(sale.price_per_head)}</dd>
            </div>
          ) : null}
          {sale.cattle_group_name ? (
            <div>
              <dt className="text-charcoal/50">Group</dt>
              <dd className="font-medium text-charcoal">{sale.cattle_group_name}</dd>
            </div>
          ) : null}
          {sale.inventory_deducted ? (
            <div>
              <dt className="text-charcoal/50">Inventory</dt>
              <dd className="font-medium text-olive">Deducted from group</dd>
            </div>
          ) : null}
          {sale.financial_category_name ? (
            <div>
              <dt className="text-charcoal/50">Category</dt>
              <dd className="font-medium text-charcoal">{sale.financial_category_name}</dd>
            </div>
          ) : null}
          {sale.location_label ? (
            <div>
              <dt className="text-charcoal/50">Location</dt>
              <dd className="font-medium text-charcoal">{sale.location_label}</dd>
            </div>
          ) : null}
          {sale.notes ? (
            <div>
              <dt className="text-charcoal/50">Notes</dt>
              <dd className="font-medium text-charcoal">{sale.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-charcoal/50">
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
