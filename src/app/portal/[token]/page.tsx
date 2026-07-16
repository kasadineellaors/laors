import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCustomerPortalByToken } from "@/lib/portal/access";
import { formatPortalMoney, getCustomerPortalData } from "@/lib/portal/customer-dashboard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Customer Portal — LAORS",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Outstanding",
  paid: "Paid",
  cancelled: "Cancelled",
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

  const openInvoices = data.invoices.filter((i) => i.status === "sent" || i.status === "draft");
  const openTotal = openInvoices.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <div className="min-h-full bg-cream">
      <header className="border-b border-border-neutral bg-surface-white px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brown">
            {data.org_name}
          </p>
          <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">{data.customer_name}</h1>
          <p className="text-sm text-text-secondary">Customer portal — lots and billing</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Your lots" value={String(data.lots.length)} />
          <Stat label="Open invoices" value={String(openInvoices.length)} />
          <Stat label="Outstanding" value={formatPortalMoney(openTotal)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your lots</CardTitle>
            <CardDescription>Cattle on feed or recently closed</CardDescription>
          </CardHeader>
          {data.lots.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-text-secondary">No lots assigned to your account yet.</p>
          ) : (
            <ul className="divide-y divide-border px-4 pb-4">
              {data.lots.map((lot) => (
                <li key={lot.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-navy">{lot.label}</p>
                    <p className="text-text-secondary">
                      {lot.status_label} · {lot.head} hd
                    </p>
                  </div>
                  {lot.closeout_token && lot.status === "closed" ? (
                    <Link
                      href={`/share/closeout/${lot.closeout_token}`}
                      className="font-semibold text-brown hover:underline"
                    >
                      View closeout
                    </Link>
                  ) : (
                    <span className="text-xs text-text-secondary">On feed</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Recent billing from {data.org_name}</CardDescription>
          </CardHeader>
          {data.invoices.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-text-secondary">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-border px-4 pb-4">
              {data.invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-navy">{invoice.invoice_number}</p>
                    <p className="text-text-secondary">
                      {invoice.invoice_date} ·{" "}
                      {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                    </p>
                  </div>
                  <span className="font-bold tabular-nums text-text-primary">
                    {formatPortalMoney(invoice.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-neutral bg-surface-white px-3 py-4 text-center">
      <p className="text-xl font-bold tabular-nums text-brown">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
