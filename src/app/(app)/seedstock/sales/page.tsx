import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode, SEEDSTOCK_SALE_TYPE_LABELS } from "@/lib/seedstock/constants";
import { listSeedstockSales } from "@/lib/sales/queries";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Seedstock Sales — LAORS",
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SeedstockSalesPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const sales = await listSeedstockSales(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/seedstock" className="text-sm font-medium text-olive hover:underline">
            ← Seedstock
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Seedstock sales</h1>
          <p className="text-charcoal/70">Live animals, semen, and embryos linked to your registry</p>
        </div>
        {canManage ? (
          <Link href="/sales/new">
            <Button size="lg">+ Sale</Button>
          </Link>
        ) : null}
      </div>

      {sales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
          No seedstock sales yet — record one from an animal or the sales screen.
        </p>
      ) : (
        <ul className="space-y-2">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/sales/${sale.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-4 transition-colors hover:border-olive hover:bg-olive/5"
              >
                <div>
                  <p className="font-semibold text-charcoal">
                    {sale.individual_animal_tag ?? "Animal"}
                    {sale.seedstock_sale_type
                      ? ` · ${SEEDSTOCK_SALE_TYPE_LABELS[sale.seedstock_sale_type]}`
                      : ""}
                  </p>
                  <p className="text-sm text-charcoal/70">
                    {sale.buyer_name || sale.customer_name || "No buyer"}
                    {sale.total_amount != null
                      ? ` · ${sale.total_amount.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-charcoal/50">
                  {formatDate(sale.sale_date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
