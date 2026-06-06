import Link from "next/link";
import type { SaleRecord } from "@/lib/sales/types";

interface SalesListProps {
  sales: SaleRecord[];
  emptyMessage?: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number | null) {
  if (amount == null) return "—";
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function SalesList({ sales, emptyMessage }: SalesListProps) {
  if (sales.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No sales recorded yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {sales.map((s) => (
        <li key={s.id}>
          <Link
            href={`/sales/${s.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">
                  {s.head_count} head{s.buyer_name ? ` → ${s.buyer_name}` : ""}
                </p>
                {s.cattle_group_name ? (
                  <p className="text-sm text-charcoal/70">{s.cattle_group_name}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-olive">{formatMoney(s.total_amount)}</p>
                <p className="text-xs text-charcoal/50">{formatDate(s.sale_date)}</p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
