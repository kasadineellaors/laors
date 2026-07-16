import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCalvingByContext } from "@/lib/cow-calf/queries";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Seedstock Calving — LAORS",
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SeedstockCalvingPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const records = await listCalvingByContext(orgId, "seedstock");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/seedstock" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
            ← Seedstock
          </Link>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Calving</h1>
          <p className="text-text-secondary">Calving ease and outcomes tied to registered dams</p>
        </div>
        {canManage ? (
          <Link href="/seedstock/calving/new">
            <Button size="lg">+ Calving</Button>
          </Link>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No seedstock calvings yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id}>
              <Link
                href={`/seedstock/calving/${r.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border-neutral bg-surface-white px-4 py-4 hover:border-navy"
              >
                <div>
                  <p className="font-semibold text-navy">
                    {r.dam_tag ?? "Dam"} → {r.calf_tag ?? "Calf"}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {r.outcome}
                    {r.calving_ease_score != null ? ` · Ease ${r.calving_ease_score}` : ""}
                    {r.birth_weight_lbs != null ? ` · ${r.birth_weight_lbs} lbs` : ""}
                  </p>
                </div>
                <span className="text-xs text-text-secondary">{formatDate(r.calved_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
