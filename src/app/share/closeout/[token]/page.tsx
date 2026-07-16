import Link from "next/link";
import { notFound } from "next/navigation";
import { getLotCloseoutPrintData } from "@/lib/lots/closeout-report";
import { resolveCloseoutShareByToken } from "@/lib/lots/closeout-share";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Lot Closeout — LAORS",
};

export default async function SharedCloseoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await resolveCloseoutShareByToken(token);
  if (!share) notFound();

  const data = await getLotCloseoutPrintData(
    share.organization_id,
    share.cattle_group_id,
    { publicShare: true },
  );
  if (!data) notFound();

  const netLabel = data.netProfit >= 0 ? "Net profit" : "Net loss";

  return (
    <div className="min-h-full bg-cream">
      <header className="border-b border-border-neutral bg-surface-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brown">
              {data.orgName}
            </p>
            <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Lot closeout</h1>
            <p className="text-sm text-text-secondary">
              {data.lotLabel} · {data.subtitle}
            </p>
          </div>
          <a href={`/api/share/closeout/${token}/pdf`} download>
            <Button variant="secondary" size="lg">
              Download PDF
            </Button>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {data.sections.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-border-neutral bg-surface-white p-4"
          >
            <h2 className="mb-3 text-lg font-bold text-navy">{section.title}</h2>
            <dl className="space-y-2 text-sm">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-4 rounded-lg bg-cream/50 px-3 py-2"
                >
                  <dt className="text-text-secondary">{row.label}</dt>
                  <dd className="font-semibold tabular-nums text-text-primary">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <div
          className={`rounded-xl border px-4 py-5 text-center ${
            data.netProfit >= 0
              ? "border-navy/30 bg-navy/10"
              : "border-status-critical/30 bg-status-critical/10"
          }`}
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {netLabel}
          </p>
          <p
            className={`text-3xl font-bold tabular-nums ${
              data.netProfit >= 0 ? "text-brown" : "text-status-critical"
            }`}
          >
            {data.netProfit.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}
          </p>
        </div>

        <p className="text-center text-xs text-text-secondary">
          Shared via{" "}
          <Link href="https://www.laorsranch.com" className="text-brown hover:underline">
            LAORS
          </Link>
        </p>
      </main>
    </div>
  );
}
