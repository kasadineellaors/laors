import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCustomerPortalByToken } from "@/lib/portal/access";
import { formatPortalMoney, getCustomerPortalData } from "@/lib/portal/customer-dashboard";
import { PortalInvoiceCard } from "@/components/portal/portal-invoice-card";
import { PortalLotCard } from "@/components/portal/portal-lot-card";

export const metadata = {
  title: "Owner Portal — LAORS",
};

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const access = await resolveCustomerPortalByToken(token);
  if (!access) notFound();

  const data = await getCustomerPortalData(access.organization_id, access.customer_id);
  if (!data) notFound();

  const dueInvoices = data.invoices.filter((i) => i.status === "sent");
  const balanceDue = dueInvoices.reduce((sum, i) => sum + i.subtotal, 0);
  const activeLots = data.lots.filter((l) => l.status !== "closed");

  return (
    <div className="min-h-full bg-cream">
      <header className="border-b border-border-neutral bg-surface-white px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brown">
            {data.org_name}
          </p>
          <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
            {data.owner_name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your cattle, billing, and closeout reports
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section className="rounded-xl border border-border-neutral bg-surface-white p-5">
          <p className="text-sm font-medium text-text-secondary">Balance due</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-brown">
            {formatPortalMoney(balanceDue)}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {dueInvoices.length === 0
              ? "No outstanding invoices right now."
              : `${dueInvoices.length} invoice${dueInvoices.length === 1 ? "" : "s"} awaiting payment`}
          </p>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-navy">Your cattle</h2>
            <p className="text-sm text-text-secondary">
              {activeLots.length > 0
                ? `${activeLots.length} lot${activeLots.length === 1 ? "" : "s"} on feed · ${activeLots.reduce((s, l) => s + l.head, 0)} head total`
                : "Lots you own or co-own at this ranch"}
            </p>
          </div>
          {data.lots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-neutral bg-surface-white px-4 py-6 text-sm text-text-secondary">
              No lots are linked to your account yet. Ask the ranch to assign your owner on each lot.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.lots.map((lot) => (
                <PortalLotCard key={lot.id} lot={lot} />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-navy">Invoices</h2>
            <p className="text-sm text-text-secondary">
              What you were charged and how each line was calculated
            </p>
          </div>
          {data.invoices.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-neutral bg-surface-white px-4 py-6 text-sm text-text-secondary">
              No invoices yet. Billing appears here after the ranch generates one for your cattle.
            </p>
          ) : (
            <ul className="space-y-4">
              {data.invoices.map((invoice) => (
                <PortalInvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-text-secondary">
          Powered by{" "}
          <Link href="https://www.laorsranch.com" className="text-brown hover:underline">
            LAORS
          </Link>
        </p>
      </main>
    </div>
  );
}
