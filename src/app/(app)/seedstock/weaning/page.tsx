import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { listWeaningRecords } from "@/lib/seedstock/weaning-queries";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Weaning Log — LAORS",
};

export default async function SeedstockWeaningPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  let records: Awaited<ReturnType<typeof listWeaningRecords>> = [];
  try {
    records = await listWeaningRecords(orgId);
  } catch {
    records = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/seedstock" className="text-sm font-medium text-olive hover:underline">
            ← Seedstock
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Weaning log</h1>
          <p className="text-charcoal/70">
            Weaning weights and replacement heifers — feeds maternal lifetime value
          </p>
        </div>
        {canManage ? (
          <Link href="/seedstock/weaning/new">
            <Button size="lg">+ Weaning</Button>
          </Link>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
          No weaning records yet — record one from a calving or the weaning screen.
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((w) => (
            <li key={w.id}>
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-4">
                <div>
                  <p className="font-semibold text-charcoal">
                    {w.calf_tag ?? "Calf"}
                    {w.dam_tag ? ` · dam ${w.dam_tag}` : ""}
                  </p>
                  <p className="text-sm text-charcoal/70">
                    {w.weaned_at}
                    {w.weaning_weight_lbs != null
                      ? ` · ${w.weaning_weight_lbs} lbs`
                      : ""}
                    {w.retained_as_heifer ? " · Retained as heifer" : ""}
                  </p>
                </div>
                {w.calf_id ? (
                  <Link
                    href={`/seedstock/animals/${w.calf_id}`}
                    className="shrink-0 text-sm font-medium text-olive hover:underline"
                  >
                    View heifer
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
