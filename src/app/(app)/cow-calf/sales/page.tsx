import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCowCalfSales, getCowCalfSalesSummary } from "@/lib/cow-calf/exit-queries";
import { COW_CALF_SALE_TYPE_LABELS } from "@/lib/cow-calf/constants";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sales — Cow-Calf — LAORS",
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

export default async function CowCalfSalesPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const [sales, summary] = await Promise.all([
    listCowCalfSales(orgId),
    getCowCalfSalesSummary(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AppPageHeader
          title="Sales"
          subtitle={`${summary.headSoldLast30Days} hd sold (30d) · ${formatMoney(summary.revenueLast30Days)}`}
        />
        {canManage ? (
          <Link href="/cow-calf/sales/new">
            <Button size="lg">+ Record sale</Button>
          </Link>
        ) : null}
      </div>

      {sales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No cow-calf sales recorded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {sales.map((s) => (
            <li key={s.id} className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4">
              <p className="font-semibold text-navy">
                {s.head_count} hd
                {s.cow_calf_sale_type ? ` · ${COW_CALF_SALE_TYPE_LABELS[s.cow_calf_sale_type]}` : ""}
                {s.buyer_name ? ` · ${s.buyer_name}` : ""}
              </p>
              <p className="text-sm text-text-secondary">
                {formatDate(s.sale_date)}
                {s.total_amount != null ? ` · ${formatMoney(s.total_amount)}` : ""}
                {s.net_amount != null && s.fees ? ` (${formatMoney(s.net_amount)} net)` : ""}
                {s.herd_name ? ` · ${s.herd_name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
