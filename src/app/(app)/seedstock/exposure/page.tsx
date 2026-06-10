import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { listExposureRecords } from "@/lib/seedstock/exposure-queries";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Exposure Records — LAORS",
};

export default async function SeedstockExposurePage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  let records: Awaited<ReturnType<typeof listExposureRecords>> = [];
  try {
    records = await listExposureRecords(orgId);
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
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Exposure records</h1>
          <p className="text-charcoal/70">Natural service breeding windows by dam and bull</p>
        </div>
        {canManage ? (
          <Link href="/seedstock/exposure/new">
            <Button size="lg">+ Exposure</Button>
          </Link>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
          No exposure records yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-surface px-4 py-4"
            >
              <p className="font-semibold text-charcoal">
                {r.dam_tag ?? "Dam"} × {r.bull_tag ?? r.sire_tag ?? "Bull"}
              </p>
              <p className="text-sm text-charcoal/70">
                {r.exposure_start}
                {r.exposure_end ? ` – ${r.exposure_end}` : " – ongoing"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
